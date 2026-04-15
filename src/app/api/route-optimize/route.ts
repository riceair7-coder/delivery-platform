import { NextRequest, NextResponse } from 'next/server';
import { DeliveryItem } from '@/types';

const OPTIMIZER_URL = process.env.OPTIMIZER_URL || 'http://localhost:8000';
const OPTIMIZER_API_KEY = process.env.OPTIMIZER_API_KEY || '';
const DEPOT_ADDRESS = process.env.DEPOT_ADDRESS || '서울시 서초구 반포대로20길 28';
const DEPOT_LAT = parseFloat(process.env.DEPOT_LAT || '0') || undefined;
const DEPOT_LNG = parseFloat(process.env.DEPOT_LNG || '0') || undefined;

export async function POST(request: NextRequest) {
  try {
    const { deliveries, driverLat, driverLng } = await request.json();
    if (!Array.isArray(deliveries)) {
      return NextResponse.json({ error: '배송 데이터가 없습니다' }, { status: 400 });
    }

    const typedDeliveries = deliveries as DeliveryItem[];

    // pending/in_progress만 최적화 대상
    const pending = typedDeliveries.filter(
      d => d.status === 'pending' || d.status === 'in_progress'
    );
    const done = typedDeliveries.filter(
      d => d.status !== 'pending' && d.status !== 'in_progress'
    );

    if (pending.length < 2) {
      return NextResponse.json({ error: '최적화할 배송이 2건 이상이어야 합니다' }, { status: 400 });
    }

    // 거점: 기사 현재 위치 또는 환경변수 거점
    const depotLat = driverLat || DEPOT_LAT;
    const depotLng = driverLng || DEPOT_LNG;

    // 최적화 서버 요청 구성
    const optimizeRequest = {
      depot: {
        address: DEPOT_ADDRESS,
        ...(depotLat && depotLng ? { lat: depotLat, lng: depotLng } : {}),
      },
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
      options: {
        use_api: true,
        use_ortools: true,
        include_original: true,
      },
    };

    // 최적화 서버 호출
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (OPTIMIZER_API_KEY) {
      headers['X-API-Key'] = OPTIMIZER_API_KEY;
    }

    const res = await fetch(`${OPTIMIZER_URL}/api/v1/optimize`, {
      method: 'POST',
      headers,
      body: JSON.stringify(optimizeRequest),
      signal: AbortSignal.timeout(120000), // 2분 타임아웃
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: '최적화 서버 오류' }));
      console.error('[route-optimize] 최적화 서버 오류:', err);
      return NextResponse.json({ error: err.detail || '최적화 실패' }, { status: res.status });
    }

    const result = await res.json();

    // 최적화 결과를 ERP DeliveryItem 형식으로 변환
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
      // 완료/실패 건은 그대로
      ...done,
      // 최적화된 순서로 재배치
      ...pending
        .map(d => {
          const opt = optimizedMap.get(d.id);
          if (!opt) return d;
          return {
            ...d,
            order: opt.order,
            distanceFromPrev: Math.round(opt.distance_from_prev_m),
            durationFromPrev: Math.round(opt.time_from_prev_sec / 60),
            estimatedArrival: new Date(
              Date.now() + opt.eta_min * 60 * 1000
            ).toISOString(),
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
      },
    });
  } catch (error) {
    console.error('[route-optimize] 오류:', error);
    return NextResponse.json({ error: '경로 최적화 중 오류가 발생했습니다' }, { status: 500 });
  }
}
