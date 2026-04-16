'use client';
import { useState, useEffect, useCallback, use } from 'react';
import { Package, MapPin, CheckCircle, Truck, Phone, MessageCircle, Clock, Navigation, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';

interface TrackingData {
  trackingNumber: string;
  status: string;
  recipientName: string;
  address: string;
  addressDetail?: string;
  lat: number;
  lng: number;
  estimatedArrival?: string;
  completedAt?: string;
  proofType?: string;
  sortOrder: number;
  distanceFromPrev: number;
  durationFromPrev: number;
  driverLocation?: {
    lat: number;
    lng: number;
    updatedAt?: string;
    driverName?: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Package }> = {
  pending: { label: '배송 준비중', color: 'text-gray-600', bg: 'bg-gray-100', icon: Package },
  in_progress: { label: '배송중', color: 'text-blue-600', bg: 'bg-blue-50', icon: Truck },
  completed: { label: '배송 완료', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  failed: { label: '배송 실패', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
};

const steps = [
  { key: 'pending', label: '준비', Icon: Package },
  { key: 'in_progress', label: '배송중', Icon: Truck },
  { key: 'completed', label: '완료', Icon: CheckCircle },
];

function stepIdx(s: string) {
  if (s === 'failed') return 1;
  return s === 'in_progress' ? 1 : s === 'completed' ? 2 : 0;
}

function fmtTime(iso?: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function fmtRelativeTime(iso?: string) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  return `${Math.floor(diff / 3600)}시간 전`;
}

function fmtDist(m: number) {
  if (m <= 0) return '';
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}

export default function TrackingPage({ params }: { params: Promise<{ trackingNumber: string }> }) {
  const { trackingNumber } = use(params);
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch(`/api/tracking/${trackingNumber}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.error || '배송 정보를 찾을 수 없습니다');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [trackingNumber]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 15s when in_progress
  useEffect(() => {
    if (!data || data.status !== 'in_progress') return;
    const interval = setInterval(() => fetchData(true), 15000);
    return () => clearInterval(interval);
  }, [data?.status, fetchData]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">배송 정보 조회 중...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-700 mb-2">정보를 찾을 수 없어요</h2>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <p className="text-gray-300 text-xs font-mono">{trackingNumber}</p>
          <button onClick={() => fetchData()} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const si = stepIdx(data.status);
  const statusConfig = STATUS_CONFIG[data.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const isFailed = data.status === 'failed';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`text-white px-4 pt-12 pb-6 ${isFailed ? 'bg-red-600' : data.status === 'completed' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/70 text-sm">배송 추적</p>
          {data.status === 'in_progress' && (
            <button onClick={() => fetchData(true)} className="flex items-center gap-1 text-white/70 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          )}
        </div>
        <h1 className="text-2xl font-bold">{data.recipientName}님의 택배</h1>
        <p className="text-white/60 text-sm font-mono mt-1">{data.trackingNumber}</p>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">

        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusConfig.bg}`}>
                <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
              </div>
              <div>
                <p className={`text-lg font-bold ${statusConfig.color}`}>{statusConfig.label}</p>
                <p className="text-xs text-gray-400">
                  {data.status === 'completed' ? `${fmtTime(data.completedAt)} 완료` :
                   data.status === 'in_progress' ? '배달 기사가 이동중입니다' :
                   isFailed ? '배송에 실패했습니다' : '배송을 준비하고 있습니다'}
                </p>
              </div>
            </div>
            {data.status === 'in_progress' && data.estimatedArrival && (
              <div className="bg-blue-50 px-3 py-2 rounded-xl text-right">
                <p className="text-[10px] text-gray-400">도착 예정</p>
                <p className="text-lg font-bold text-blue-600">{fmtTime(data.estimatedArrival)}</p>
              </div>
            )}
          </div>

          {/* Progress Steps */}
          {!isFailed && (
            <div className="flex items-center">
              {steps.map(({ key, label, Icon }, i) => (
                <div key={key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
                      ${i < si ? 'bg-emerald-500 text-white' :
                        i === si ? (data.status === 'in_progress' ? 'bg-blue-500 text-white ring-4 ring-blue-100 animate-pulse' : 'bg-blue-500 text-white ring-4 ring-blue-100') :
                        'bg-gray-100 text-gray-400'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className={`text-xs mt-1.5 font-medium ${
                      i === si ? (data.status === 'completed' ? 'text-emerald-600' : 'text-blue-600') :
                      i < si ? 'text-emerald-600' : 'text-gray-400'}`}>{label}</p>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-5 rounded-full ${i < si ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Failed status */}
          {isFailed && (
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">배송이 실패되었습니다. 고객센터로 문의해주세요.</p>
            </div>
          )}
        </div>

        {/* Driver Location - Live */}
        {data.status === 'in_progress' && data.driverLocation && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-500" />
                배달 기사 위치
              </h3>
              {data.driverLocation.updatedAt && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  {fmtRelativeTime(data.driverLocation.updatedAt)} 갱신
                </span>
              )}
            </div>

            {/* Mini map placeholder */}
            <div className="h-40 bg-gray-100 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-emerald-50" />
              <div className="relative text-center">
                <Truck className="w-8 h-8 text-blue-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500">
                  기사님이 이동 중입니다
                </p>
                {data.distanceFromPrev > 0 && (
                  <p className="text-sm font-bold text-blue-600 mt-1">
                    약 {fmtDist(data.distanceFromPrev)} / {Math.round(data.durationFromPrev)}분
                  </p>
                )}
              </div>
            </div>

            {data.driverLocation.driverName && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Truck className="w-4 h-4 text-blue-500" />
                </div>
                <span className="font-medium">{data.driverLocation.driverName} 기사님</span>
              </div>
            )}
          </div>
        )}

        {/* Delivery Address */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            배송지
          </h3>
          <p className="text-gray-900 font-medium">{data.address}</p>
          {data.addressDetail && (
            <p className="text-gray-500 text-sm mt-1">{data.addressDetail}</p>
          )}
        </div>

        {/* ETA Info */}
        {data.status === 'in_progress' && data.estimatedArrival && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-500" />
              <div>
                <p className="font-semibold text-blue-800">
                  {fmtTime(data.estimatedArrival)} 도착 예정
                </p>
                <p className="text-sm text-blue-600">
                  {data.durationFromPrev > 0 ? `약 ${Math.round(data.durationFromPrev)}분 소요 예상` : '잠시 후 도착합니다'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Contact Driver */}
        {data.status === 'in_progress' && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold mb-1">기사님께 연락</h3>
            <p className="text-gray-400 text-sm mb-4">개인정보 보호를 위해 안심번호로 연결됩니다</p>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-xl font-medium hover:bg-blue-100 transition-colors">
                <Phone className="w-5 h-5" />전화하기
              </button>
              <button className="flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-600 rounded-xl font-medium hover:bg-gray-100 transition-colors">
                <MessageCircle className="w-5 h-5" />메시지
              </button>
            </div>
          </div>
        )}

        {/* Completed */}
        {data.status === 'completed' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-bold text-emerald-800 text-lg mb-1">배송이 완료되었습니다</h3>
            <p className="text-emerald-600 text-sm">
              {data.proofType === 'pin' ? 'PIN 인증으로 확인됨' :
               data.proofType === 'signature' ? '서명으로 확인됨' :
               data.proofType === 'photo' ? '사진으로 확인됨' : ''}
            </p>
            {data.completedAt && (
              <p className="text-emerald-500 text-xs mt-2">
                {new Date(data.completedAt).toLocaleString('ko-KR')}
              </p>
            )}
          </div>
        )}

        {/* Auto-refresh notice */}
        {data.status === 'in_progress' && (
          <p className="text-center text-xs text-gray-400 pb-4">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              실시간 업데이트 중 (15초 간격)
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
