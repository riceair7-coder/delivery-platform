'use client';
import { useState, useEffect } from 'react';
import { Package, MapPin, CheckCircle, Truck, Phone, MessageCircle } from 'lucide-react';

interface TrackingData {
  trackingNumber: string; status: string; recipientName: string; address: string;
  estimatedArrival: string; completedAt?: string;
  driverLocation?: { lat: number; lng: number; updatedAt: string } | null;
}

const steps = [
  { key: 'pending', label: '배송 준비', Icon: Package },
  { key: 'in_progress', label: '배송중', Icon: Truck },
  { key: 'completed', label: '배송 완료', Icon: CheckCircle },
];

function stepIdx(s: string) { return s === 'in_progress' ? 1 : s === 'completed' ? 2 : 0; }
function fmtTime(iso?: string) { return iso ? new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'; }

export default function TrackingPage({ params }: { params: { trackingNumber: string } }) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/tracking/${params.trackingNumber}`)
      .then(r => r.json())
      .then(res => { if (res.success) setData(res.data); else setError('배송 정보를 찾을 수 없습니다'); })
      .catch(() => setError('오류가 발생했습니다'))
      .finally(() => setLoading(false));
  }, [params.trackingNumber]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">배송 정보 조회 중...</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-700 mb-2">정보를 찾을 수 없어요</h2>
        <p className="text-gray-400 text-xs">{params.trackingNumber}</p>
      </div>
    </div>
  );

  const si = stepIdx(data.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white px-4 pt-12 pb-6">
        <p className="text-blue-200 text-sm mb-1">배송 추적</p>
        <h1 className="text-2xl font-bold">{data.recipientName}님의 택배</h1>
        <p className="text-blue-200 text-sm font-mono">{data.trackingNumber}</p>
      </div>

      <div className="px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500">현재 상태</p>
              <p className="text-xl font-bold">{data.status === 'completed' ? '배송 완료' : data.status === 'in_progress' ? '배송중' : '배송 준비'}</p>
            </div>
            {data.status === 'in_progress' && (
              <div className="bg-blue-50 px-3 py-2 rounded-xl text-right">
                <p className="text-xs text-gray-500">도착 예정</p>
                <p className="text-lg font-bold text-blue-600">{fmtTime(data.estimatedArrival)}</p>
              </div>
            )}
            {data.status === 'completed' && (
              <div className="bg-emerald-50 px-3 py-2 rounded-xl text-right">
                <p className="text-xs text-gray-500">완료 시각</p>
                <p className="text-lg font-bold text-emerald-600">{fmtTime(data.completedAt)}</p>
              </div>
            )}
          </div>

          <div className="flex items-center">
            {steps.map(({ key, label, Icon }, i) => (
              <div key={key} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${i < si ? 'bg-emerald-500 text-white' : i === si ? 'bg-blue-500 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className={`text-xs mt-1 font-medium ${i === si ? 'text-blue-600' : i < si ? 'text-emerald-600' : 'text-gray-400'}`}>{label}</p>
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-5 ${i < si ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-500" />배송지</h3>
          <p className="text-gray-700">{data.address}</p>
        </div>

        {data.status === 'in_progress' && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold mb-1">기사님께 연락</h3>
            <p className="text-gray-400 text-sm mb-4">개인정보 보호 익명 연결</p>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-xl font-medium">
                <Phone className="w-5 h-5" />전화하기
              </button>
              <button className="flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-600 rounded-xl font-medium">
                <MessageCircle className="w-5 h-5" />메시지
              </button>
            </div>
          </div>
        )}

        {data.status === 'completed' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-bold text-emerald-800 text-lg">배송이 완료되었습니다</h3>
          </div>
        )}
      </div>
    </div>
  );
}
