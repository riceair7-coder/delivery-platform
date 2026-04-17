'use client';

import { useEffect, useRef, useState } from 'react';
import { useDeliveryStore } from '@/store/deliveryStore';
import { DeliveryItem } from '@/types';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    kakao: any;
  }
}

function getKakaoKey(): string {
  return process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '';
}

// 배송 상태별 마커 색상
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  completed: { bg: '#10b981', border: '#059669', text: '#fff' },
  in_progress: { bg: '#3b82f6', border: '#2563eb', text: '#fff' },
  pending: { bg: '#fff', border: '#3b82f6', text: '#3b82f6' },
  failed: { bg: '#ef4444', border: '#dc2626', text: '#fff' },
};

function createDepotMarker(): string {
  return `
    <div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;
      background:#1e293b;border:3px solid #f59e0b;border-radius:50%;
      color:#f59e0b;box-shadow:0 2px 8px rgba(0,0,0,0.3);
      position:relative;top:-20px;left:-20px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/>
        <path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/>
      </svg>
    </div>`;
}

function createHomeMarker(): string {
  return `
    <div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;
      background:#7c3aed;border:3px solid #a78bfa;border-radius:50%;
      color:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);
      position:relative;top:-20px;left:-20px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </div>`;
}

function createMarkerContent(delivery: DeliveryItem): string {

  const colors = STATUS_COLORS[delivery.status] || STATUS_COLORS.pending;
  const isActive = delivery.status === 'in_progress';
  const size = isActive ? 34 : 28;
  const fontSize = isActive ? 14 : 12;
  const shadow = isActive ? '0 0 0 4px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.15)';

  return `
    <div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;
      background:${colors.bg};border:2.5px solid ${colors.border};border-radius:50%;
      color:${colors.text};font-size:${fontSize}px;font-weight:700;
      box-shadow:${shadow};position:relative;top:-${size / 2}px;left:-${size / 2}px;
      ${delivery.status === 'completed' ? 'opacity:0.5;' : ''}">
      ${delivery.status === 'completed' ? '&#10003;' : delivery.order}
    </div>`;
}

function createInfoContent(delivery: DeliveryItem): string {
  const pkg = delivery.package;
  const statusLabels: Record<string, string> = {
    pending: '대기', in_progress: '배송중', completed: '완료', failed: '실패',
  };
  const statusLabel = statusLabels[delivery.status] || delivery.status;
  const colors = STATUS_COLORS[delivery.status] || STATUS_COLORS.pending;

  return `
    <div style="padding:12px;min-width:200px;font-family:-apple-system,sans-serif;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;
          background:${colors.bg};border:2px solid ${colors.border};border-radius:50%;
          color:${colors.text};font-size:12px;font-weight:700;">${delivery.order}</span>
        <span style="font-size:12px;color:${colors.border};font-weight:600;">${statusLabel}</span>
      </div>
      <p style="font-size:13px;font-weight:600;color:#111;margin:0 0 4px;">${pkg.address}</p>
      ${pkg.addressDetail ? `<p style="font-size:12px;color:#666;margin:0 0 6px;">${pkg.addressDetail}</p>` : ''}
      <div style="display:flex;gap:12px;font-size:11px;color:#888;">
        <span>${pkg.recipientName}</span>
        <span>${pkg.weight}kg</span>
        ${delivery.durationFromPrev ? `<span>${delivery.durationFromPrev}분</span>` : ''}
      </div>
      ${pkg.specialInstructions ? `<div style="margin-top:6px;padding:4px 8px;background:#fffbeb;border-radius:4px;font-size:11px;color:#b45309;">
        ${pkg.specialInstructions}</div>` : ''}
    </div>`;
}

export function RouteMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [depot, setDepot] = useState<{ name: string; address: string; lat: number; lng: number } | null>(null);
  const { route, driver } = useDeliveryStore();
  const routeData = route;
  const driverData = driver;

  // 거점 조회
  useEffect(() => {
    fetch('/api/system/depot')
      .then(r => r.json())
      .then(j => { if (j.success) setDepot(j.data); })
      .catch(() => {});
  }, []);

  // 카카오맵 SDK 로드
  useEffect(() => {
    if (window.kakao?.maps) {
      setLoading(false);
      return;
    }

    const jsKey = getKakaoKey();
    if (!jsKey) {
      setError('카카오맵 API 키가 설정되지 않았습니다');
      setLoading(false);
      return;
    }

    const script = document.createElement('script');
    // API route로 SDK 번들 제공 (광고 차단기 우회)
    script.src = '/api/map-sdk';
    script.async = true;
    script.onload = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => setLoading(false));
      } else {
        setError('카카오맵 SDK 초기화 실패');
        setLoading(false);
      }
    };
    script.onerror = () => {
      console.error('카카오맵 SDK 로드 실패');
      setError('카카오맵 로드 실패');
      setLoading(false);
    };
    document.head.appendChild(script);
  }, []);

  // 지도 초기화 + 마커/경로 그리기
  useEffect(() => {
    if (loading || error || !mapRef.current || !window.kakao?.maps || !routeData || !driverData) return;

    const kakao = window.kakao;
    const deliveries = [...routeData.deliveries].sort((a, b) => a.order - b.order);
    const validDeliveries = deliveries.filter(d => d.package.lat && d.package.lng);

    if (validDeliveries.length === 0) return;

    // 지도 생성
    if (!mapInstance.current) {
      const center = new kakao.maps.LatLng(
        driverData?.currentLat || validDeliveries[0].package.lat,
        driverData?.currentLng || validDeliveries[0].package.lng,
      );
      mapInstance.current = new kakao.maps.Map(mapRef.current, {
        center,
        level: 7,
      });
    }

    const map = mapInstance.current;

    // 기존 마커/라인 제거
    markersRef.current.forEach(m => m.setMap(null));
    polylinesRef.current.forEach(p => p.setMap(null));
    markersRef.current = [];
    polylinesRef.current = [];
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }

    // 공유 InfoWindow
    const infoWindow = new kakao.maps.InfoWindow({ zIndex: 10 });
    infoWindowRef.current = infoWindow;

    // bounds
    const bounds = new kakao.maps.LatLngBounds();
    const routePoints: any[] = [];

    // 거점 마커 (공통 출발지)
    if (depot) {
      const depotPos = new kakao.maps.LatLng(depot.lat, depot.lng);
      bounds.extend(depotPos);
      routePoints.push(depotPos);

      const depotContent = document.createElement('div');
      depotContent.innerHTML = createDepotMarker();
      depotContent.style.cursor = 'pointer';
      depotContent.onclick = () => {
        infoWindow.setContent(`
          <div style="padding:10px;min-width:180px;font-family:-apple-system,sans-serif;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="padding:2px 6px;background:#f59e0b;color:#fff;border-radius:4px;font-size:10px;font-weight:700;">거점</span>
              <span style="font-size:12px;color:#666;">출발지</span>
            </div>
            <p style="font-size:13px;font-weight:600;margin:0 0 2px;">${depot.name}</p>
            <p style="font-size:12px;color:#555;margin:0;">${depot.address}</p>
          </div>`);
        infoWindow.setPosition(depotPos);
        infoWindow.open(map);
      };

      const depotOverlay = new kakao.maps.CustomOverlay({
        position: depotPos,
        content: depotContent,
        yAnchor: 0,
        xAnchor: 0,
        zIndex: 8,
      });
      depotOverlay.setMap(map);
      markersRef.current.push(depotOverlay);
    }

    // 종점 마커 (기사별 퇴근지)
    if (driverData?.homeLat && driverData?.homeLng) {
      const homePos = new kakao.maps.LatLng(driverData.homeLat, driverData.homeLng);
      bounds.extend(homePos);

      const homeContent = document.createElement('div');
      homeContent.innerHTML = createHomeMarker();
      homeContent.style.cursor = 'pointer';
      homeContent.onclick = () => {
        infoWindow.setContent(`
          <div style="padding:10px;min-width:180px;font-family:-apple-system,sans-serif;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="padding:2px 6px;background:#7c3aed;color:#fff;border-radius:4px;font-size:10px;font-weight:700;">종점</span>
              <span style="font-size:12px;color:#666;">퇴근지</span>
            </div>
            <p style="font-size:13px;font-weight:600;margin:0 0 2px;">${driverData.name}</p>
            <p style="font-size:12px;color:#555;margin:0;">${driverData.homeAddress || '등록된 주소 없음'}</p>
          </div>`);
        infoWindow.setPosition(homePos);
        infoWindow.open(map);
      };

      const homeOverlay = new kakao.maps.CustomOverlay({
        position: homePos,
        content: homeContent,
        yAnchor: 0,
        xAnchor: 0,
        zIndex: 8,
      });
      homeOverlay.setMap(map);
      markersRef.current.push(homeOverlay);
    }

    // 배송지 마커
    const pendingDeliveries = validDeliveries.filter(d => d.status !== 'completed');
    const completedDeliveries = validDeliveries.filter(d => d.status === 'completed');

    // 완료된 것 먼저 (아래에 깔리도록)
    [...completedDeliveries, ...pendingDeliveries].forEach(delivery => {
      const pos = new kakao.maps.LatLng(delivery.package.lat, delivery.package.lng);
      bounds.extend(pos);

      if (delivery.status !== 'completed') {
        routePoints.push(pos);
      }

      const content = document.createElement('div');
      content.innerHTML = createMarkerContent(delivery);
      content.style.cursor = 'pointer';
      content.onclick = () => {
        infoWindow.setContent(createInfoContent(delivery));
        infoWindow.setPosition(pos);
        infoWindow.open(map);
      };

      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        content,
        yAnchor: 0,
        xAnchor: 0,
        zIndex: delivery.status === 'in_progress' ? 5 : delivery.status === 'pending' ? 3 : 1,
      });
      overlay.setMap(map);
      markersRef.current.push(overlay);
    });

    // 종점을 경로 끝에 추가 (Open TSP: 거점→배송→종점)
    if (driverData?.homeLat && driverData?.homeLng) {
      routePoints.push(new kakao.maps.LatLng(driverData.homeLat, driverData.homeLng));
    }

    // 경로 폴리라인 — 기본 직선을 먼저 표시 (로딩 중 UX)
    if (routePoints.length >= 2) {
      const straightLine = new kakao.maps.Polyline({
        path: routePoints,
        strokeWeight: 3,
        strokeColor: '#93c5fd', // 연한 파랑 (로딩용)
        strokeOpacity: 0.5,
        strokeStyle: 'shortdash',
      });
      straightLine.setMap(map);
      polylinesRef.current.push(straightLine);

      // 카카오 Directions API로 실제 도로 경로 비동기 조회
      const pointsForApi = routePoints.map((p: any) => ({ lat: p.getLat(), lng: p.getLng() }));

      fetch('/api/route-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: pointsForApi }),
      })
        .then(r => r.json())
        .then(data => {
          if (!data.success) return;
          const legs = data.data.legs;

          // 직선 제거 (실제 경로로 대체)
          straightLine.setMap(null);

          // 각 구간별 실제 도로 경로 그리기
          for (const leg of legs) {
            if (!leg.coords || leg.coords.length < 2) continue;
            const path = leg.coords.map((c: any) => new kakao.maps.LatLng(c.lat, c.lng));
            const roadLine = new kakao.maps.Polyline({
              path,
              strokeWeight: 5,
              strokeColor: leg.fromFallback ? '#93c5fd' : '#3b82f6',
              strokeOpacity: leg.fromFallback ? 0.5 : 0.85,
              strokeStyle: leg.fromFallback ? 'shortdash' : 'solid',
            });
            roadLine.setMap(map);
            polylinesRef.current.push(roadLine);
          }
        })
        .catch(() => {
          // API 실패 시 기본 직선 유지
        });

      // 점선: 완료된 경로 (현재 위치 → 완료 배송지)
      if (driverData.currentLat && driverData.currentLng && completedDeliveries.length > 0) {
        const completedPoints = [
          new kakao.maps.LatLng(driverData.currentLat, driverData.currentLng),
          ...completedDeliveries.map(d => new kakao.maps.LatLng(d.package.lat, d.package.lng)),
        ];
        const dottedLine = new kakao.maps.Polyline({
          path: completedPoints,
          strokeWeight: 3,
          strokeColor: '#10b981',
          strokeOpacity: 0.4,
          strokeStyle: 'shortdash',
        });
        dottedLine.setMap(map);
        polylinesRef.current.push(dottedLine);
      }
    }

    // 지도 범위 조정
    map.setBounds(bounds, 50);

    // 지도 클릭 시 InfoWindow 닫기
    kakao.maps.event.addListener(map, 'click', () => {
      infoWindow.close();
    });

  }, [loading, error, depot, routeData?.deliveries, routeData?.optimized, driverData?.currentLat, driverData?.currentLng, driverData?.homeLat, driverData?.homeLng]);

  if (error) {
    return (
      <div className="flex-1 bg-gray-100 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-red-500 font-medium mb-2">{error}</p>
          <p className="text-gray-400 text-sm">.env.local에 NEXT_PUBLIC_KAKAO_JS_KEY를 설정하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {loading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}
      <div ref={mapRef} className="absolute inset-0" />

      {/* 범례 */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-xl shadow-lg px-3 py-2.5 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-gray-900" />
            <span className="text-gray-600">거점</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-purple-500 border-2 border-purple-300" />
            <span className="text-gray-600">종점</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-600" />
            <span className="text-gray-600">배송중</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-white border-2 border-blue-500" />
            <span className="text-gray-600">대기</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-emerald-600 opacity-50" />
            <span className="text-gray-600">완료</span>
          </div>
        </div>
      </div>

      {/* 경로 요약 */}
      {routeData?.optimized && (
        <div className="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur rounded-xl shadow-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">최적화 경로</p>
              <p className="text-sm font-bold text-gray-900">
                {routeData?.deliveries.filter(d => d.status === 'pending' || d.status === 'in_progress').length || 0}건 남음
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">예상 소요</p>
              <p className="text-sm font-bold text-blue-600">
                {(routeData?.estimatedDuration || 0) > 0 ? `${Math.round((routeData?.estimatedDuration || 0) / 60)}분` : '-'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">총 거리</p>
              <p className="text-sm font-bold text-gray-900">
                {(routeData?.totalDistance || 0) > 0 ? `${((routeData?.totalDistance || 0) / 1000).toFixed(1)}km` : '-'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
