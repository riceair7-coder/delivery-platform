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

function createMarkerContent(delivery: DeliveryItem, isDepot = false): string {
  if (isDepot) {
    return `
      <div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;
        background:#1e293b;border:3px solid #f59e0b;border-radius:50%;
        color:#f59e0b;font-size:14px;font-weight:800;box-shadow:0 2px 8px rgba(0,0,0,0.3);
        position:relative;top:-18px;left:-18px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>`;
  }

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
  const { route, driver } = useDeliveryStore();
  const routeData = route;
  const driverData = driver;

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

    // 거점 마커
    if (driverData.currentLat && driverData.currentLng) {
      const depotPos = new kakao.maps.LatLng(driverData.currentLat, driverData.currentLng);
      bounds.extend(depotPos);
      routePoints.push(depotPos);

      const depotContent = document.createElement('div');
      depotContent.innerHTML = createMarkerContent({} as DeliveryItem, true);

      const depotOverlay = new kakao.maps.CustomOverlay({
        position: depotPos,
        content: depotContent,
        yAnchor: 0,
        xAnchor: 0,
      });
      depotOverlay.setMap(map);
      markersRef.current.push(depotOverlay);
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

    // 경로 폴리라인 (완료 제외, 순서대로)
    if (routePoints.length >= 2) {
      const polyline = new kakao.maps.Polyline({
        path: routePoints,
        strokeWeight: 4,
        strokeColor: '#3b82f6',
        strokeOpacity: 0.8,
        strokeStyle: 'solid',
      });
      polyline.setMap(map);
      polylinesRef.current.push(polyline);

      // 점선: 완료된 경로
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

  }, [loading, error, routeData?.deliveries, routeData?.optimized, driverData?.currentLat, driverData?.currentLng]);

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
