'use client';
import { useState } from 'react';
import { mockDriver, mockDeliveries, mockRoute } from '@/lib/mockData';
import { Package, CheckCircle, XCircle, Truck, TrendingUp, Users } from 'lucide-react';

export default function AdminPage() {
  const [tab, setTab] = useState<'overview' | 'drivers' | 'deliveries'>('overview');
  const completed = mockDeliveries.filter(d => d.status === 'completed').length;
  const inProgress = mockDeliveries.filter(d => d.status === 'in_progress').length;
  const failed = mockDeliveries.filter(d => d.status === 'failed').length;
  const rate = Math.round((completed / mockDeliveries.length) * 100);

  const stats = [
    { label: '오늘 총 배송', val: mockDeliveries.length, Icon: Package, bg: 'bg-blue-50', txt: 'text-blue-600', ib: 'bg-blue-500' },
    { label: '완료', val: completed, Icon: CheckCircle, bg: 'bg-emerald-50', txt: 'text-emerald-600', ib: 'bg-emerald-500' },
    { label: '진행중', val: inProgress, Icon: Truck, bg: 'bg-amber-50', txt: 'text-amber-600', ib: 'bg-amber-500' },
    { label: '실패', val: failed, Icon: XCircle, bg: 'bg-red-50', txt: 'text-red-600', ib: 'bg-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-6 pt-12 pb-6">
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <p className="text-gray-400 text-sm mt-1">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
      </div>

      <div className="bg-white border-b border-gray-200 px-4">
        <div className="flex gap-1 max-w-md mx-auto">
          {[['overview', '개요'], ['drivers', '배송기사'], ['deliveries', '배송현황']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k as typeof tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === k ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {stats.map(({ label, val, Icon, bg, txt, ib }) => (
                <div key={label} className={`${bg} rounded-2xl p-4`}>
                  <div className={`w-10 h-10 ${ib} text-white rounded-xl flex items-center justify-center mb-3`}><Icon className="w-5 h-5" /></div>
                  <p className={`text-2xl font-bold ${txt}`}>{val}</p>
                  <p className="text-gray-600 text-sm">{label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" />배송 완료율</h3>
                <span className="text-2xl font-bold text-blue-600">{rate}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${rate}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500"><span>목표: 95%</span><span>현재: {rate}%</span></div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold mb-4">AI 노선 최적화 효과</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-xl font-bold">{(mockRoute.totalDistance/1000).toFixed(1)}km</p><p className="text-xs text-gray-500 mt-1">총 이동거리</p></div>
                <div><p className="text-xl font-bold">{Math.round(mockRoute.estimatedDuration/60)}분</p><p className="text-xs text-gray-500 mt-1">예상 시간</p></div>
                <div><p className="text-xl font-bold text-emerald-600">-20%</p><p className="text-xs text-gray-500 mt-1">시간 절감</p></div>
              </div>
            </div>
          </>
        )}

        {tab === 'drivers' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><Users className="w-6 h-6 text-blue-500" /></div>
                <div className="flex-1">
                  <p className="font-bold">{mockDriver.name}</p>
                  <p className="text-sm text-gray-500">🏍 {mockDriver.vehicleNumber}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${mockDriver.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {mockDriver.isOnline ? '운행중' : '오프라인'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <div className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{mockDriver.todayCompleted}</p><p className="text-xs text-gray-500 mt-1">완료</p></div>
              <div className="p-4 text-center"><p className="text-2xl font-bold text-red-500">{mockDriver.todayFailed}</p><p className="text-xs text-gray-500 mt-1">실패</p></div>
              <div className="p-4 text-center"><p className="text-base font-bold">₩{mockDriver.estimatedEarnings.toLocaleString()}</p><p className="text-xs text-gray-500 mt-1">수입</p></div>
            </div>
          </div>
        )}

        {tab === 'deliveries' && (
          <div className="space-y-3">
            {mockDeliveries.map(d => (
              <div key={d.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-mono text-gray-400">{d.package.trackingNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : d.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : d.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                    {d.status === 'completed' ? '완료' : d.status === 'in_progress' ? '배송중' : d.status === 'failed' ? '실패' : '대기'}
                  </span>
                </div>
                <p className="font-medium text-gray-900 truncate">{d.package.address}</p>
                <p className="text-sm text-gray-500">{d.package.recipientName}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
