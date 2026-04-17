import { NextRequest, NextResponse } from 'next/server';
import { DeliveryItem } from '@/types';
import { getDepot } from '@/lib/depot';
import { optimizeRoute as localOptimize } from '@/lib/routeOptimizer';

const OPTIMIZER_URL = process.env.OPTIMIZER_URL || '';
const OPTIMIZER_API_KEY = process.env.OPTIMIZER_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const {
      deliveries,
      vehicleType = 'car',
      driverHomeLat,
      driverHomeLng,
      driverHomeAddress,
    } = await request.json();

    if (!Array.isArray(deliveries)) {
      return NextResponse.json({ error: '배송 데이터가 없습니다' }, { status: 400 });
    }

    const typedDeliveries = deliveries as DeliveryItem[];

    const pending = typedDeliveries.filter(
      d => d.status === 'pending' || d.status === 'in_progress'
    );

    if (pending.length < 2) {
      return NextResponse.json({ error: '최적화할 배송이 2건 이상이어야 합니다' }, { status: 400 });
    }

    // 거점 (공통 출발지)
    const depot = getDepot();

    // 종점 (기사별 퇴근지) — Open TSP
    const hasHome =
      typeof driverHomeLat === 'number' &&
      typeof driverHomeLng === 'number';

    // 외부 최적화 서버가 설정되어 있으면 먼저 시도
    if (OPTIMIZER_URL) {
      try {
        const optimizeRequest: any = {
          depot: { address: depot.address, lat: depot.lat, lng: depot.lng },
          ...(hasHome
            ? {
                endpoint: {
                  address: driverHomeAddress || '기사 종점',
                  lat: driverHomeLat,
                  lng: driverHomeLng,
                },
              }
            : {}),
          open_tsp: hasHome,
          deliveries: pending.map(d => ({
            id: d.id,
            address: `${d.package.address} ${d.package.addressDetail || ''}`.trim(),
            lat: d.package.lat || undefined,
            lng: d.package.lng || undefined,
            recipient: d.package.recipientName,
            phone: d.package.recipientPhone,
            note: d.package.specialInstructions || undefined,
            weight_kg: d.package.weight,
          })),
          options: { use_api: true, use_ortools: true, include_original: true },
        };

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (OPTIMIZER_API_KEY) headers['X-API-Key'] = OPTIMIZER_API_KEY;

        const res = await fetch(`${OPTIMIZER_URL}/api/v1/optimize`, {
          method: 'POST',
          headers,
          body: JSON.stringify(optimizeRequest),
          signal: AbortSignal.timeout(30000),
        });

        if (res.ok) {
          const result = await res.json();
          return buildExternalResponse(result, typedDeliveries, pending, depot, hasHome, driverHomeLat, driverHomeLng, driverHomeAddress);
        }
        console.warn('[route-optimize] 외부 서버 응답 실패, fallback 사용');
      } catch (e) {
        console.warn('[route-optimize] 외부 서버 연결 실패, fallback 사용:', (e as Error).message);
      }
    }

    // ===== Fallback: 로컬 Nearest Neighbor TSP =====
    // 거점에서 출발
    const localResult = localOptimize({
      deliveries: typedDeliveries,
      driverLat: depot.lat,
      driverLng: depot.lng,
      vehicleType: vehicleType as any,
    });

    // 종점까지 거리 추가
    let finalDistance = localResult.totalDistance;
    let finalDuration = localResult.estimatedDuration;

    if (hasHome) {
      // 마지막 배송지에서 종점까지
      const optimizedPending = localResult.optimizedDeliveries.filter(
        d => d.status === 'pending' || d.status === 'in_progress'
      );
      const last = optimizedPending[optimizedPending.length - 1];
      if (last) {
        const R = 6371000;
        const phi1 = (last.package.lat * Math.PI) / 180;
        const phi2 = (driverHomeLat * Math.PI) / 180;
        const dPhi = ((driverHomeLat - last.package.lat) * Math.PI) / 180;
        const dLam = ((driverHomeLng - last.package.lng) * Math.PI) / 180;
        const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
        const homeDist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        finalDistance += Math.round(homeDist);
        // 속도 가정 (차량 8.3 m/s)
        const speeds: Record<string, number> = { motorcycle: 13.9, bicycle: 4.2, car: 8.3, van: 6.9 };
        finalDuration += Math.round(homeDist / (speeds[vehicleType] || 8.3));
      }
    }

    // 기존(최적화 전) 순서 기준 거리 계산 (절감률 표시용)
    const originalDistance = calculateOriginalDistance(pending, depot, hasHome ? { lat: driverHomeLat, lng: driverHomeLng } : null);

    return NextResponse.json({
      success: true,
      data: {
        optimizedDeliveries: localResult.optimizedDeliveries,
        totalDistance: finalDistance,
        estimatedDuration: finalDuration,
        savedTime: Math.max(0, Math.round(finalDuration * 0.2)),
        savedTimePercent: originalDistance > 0 ? Math.round((1 - finalDistance / originalDistance) * 100) : 0,
        originalDistance,
        originalDuration: 0,
        processingTime: 0,
        apiCalls: 0,
        depot: { address: depot.address, lat: depot.lat, lng: depot.lng },
        endpoint: hasHome
          ? { address: driverHomeAddress, lat: driverHomeLat, lng: driverHomeLng }
          : null,
        openTsp: hasHome,
        usedFallback: true,
      },
    });
  } catch (error) {
    console.error('[route-optimize] 오류:', error);
    return NextResponse.json({ error: '경로 최적화 중 오류가 발생했습니다' }, { status: 500 });
  }
}

function calculateOriginalDistance(
  pending: DeliveryItem[],
  depot: { lat: number; lng: number },
  endpoint: { lat: number; lng: number } | null,
): number {
  const R = 6371000;
  const hav = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLam = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  let total = 0;
  let prevLat = depot.lat;
  let prevLng = depot.lng;
  const sorted = [...pending].sort((a, b) => a.order - b.order);
  for (const d of sorted) {
    total += hav(prevLat, prevLng, d.package.lat, d.package.lng);
    prevLat = d.package.lat;
    prevLng = d.package.lng;
  }
  if (endpoint) {
    total += hav(prevLat, prevLng, endpoint.lat, endpoint.lng);
  }
  return Math.round(total);
}

function buildExternalResponse(
  result: any,
  typedDeliveries: DeliveryItem[],
  pending: DeliveryItem[],
  depot: { address: string; lat: number; lng: number },
  hasHome: boolean,
  driverHomeLat?: number,
  driverHomeLng?: number,
  driverHomeAddress?: string,
) {
  const done = typedDeliveries.filter(
    d => d.status !== 'pending' && d.status !== 'in_progress'
  );

  const optimizedMap = new Map<string, {
    order: number;
    eta_min: number;
    distance_from_prev_m: number;
    time_from_prev_sec: number;
    building_type: string;
  }>();

  for (const stop of result.optimized_route) {
    optimizedMap.set(stop.id, {
      order: done.length + stop.order,
      eta_min: stop.eta_min,
      distance_from_prev_m: stop.distance_from_prev_m,
      time_from_prev_sec: stop.time_from_prev_sec,
      building_type: stop.building_type,
    });
  }

  const optimizedDeliveries: DeliveryItem[] = [
    ...done,
    ...pending
      .map(d => {
        const opt = optimizedMap.get(d.id);
        if (!opt) return d;
        return {
          ...d,
          order: opt.order,
          distanceFromPrev: Math.round(opt.distance_from_prev_m),
          durationFromPrev: Math.round(opt.time_from_prev_sec / 60),
          estimatedArrival: new Date(Date.now() + opt.eta_min * 60 * 1000).toISOString(),
        };
      })
      .sort((a, b) => a.order - b.order),
  ];

  return NextResponse.json({
    success: true,
    data: {
      optimizedDeliveries,
      totalDistance: Math.round((result.summary.total_distance_km || 0) * 1000),
      estimatedDuration: Math.round((result.summary.estimated_duration_min || 0) * 60),
      savedTime: Math.round((result.summary.time_saved_min || 0) * 60),
      savedTimePercent: result.summary.time_saved_pct || 0,
      originalDistance: Math.round((result.summary.original_distance_km || 0) * 1000),
      originalDuration: Math.round((result.summary.original_time_min || 0) * 60),
      processingTime: result.processing_time_sec,
      apiCalls: result.summary.api_calls,
      depot,
      endpoint: hasHome ? { address: driverHomeAddress, lat: driverHomeLat, lng: driverHomeLng } : null,
      openTsp: hasHome,
      usedFallback: false,
    },
  });
}
