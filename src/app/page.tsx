import Link from 'next/link';
import { Truck, MapPin, BarChart3 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col items-center justify-center p-6">
      <div className="text-center text-white mb-12">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Truck className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">스마트 배송</h1>
        <p className="text-blue-200">AI 기반 라스트마일 최적화 플랫폼</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <Link href="/driver" className="block">
          <div className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-lg active:scale-95 transition-transform cursor-pointer">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center"><Truck className="w-6 h-6 text-white" /></div>
            <div><p className="font-bold text-gray-900">배송기사 앱</p><p className="text-sm text-gray-500">경로 최적화 · 배송 관리</p></div>
          </div>
        </Link>
        <Link href="/track/DL20260319002" className="block">
          <div className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-lg active:scale-95 transition-transform cursor-pointer">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center"><MapPin className="w-6 h-6 text-white" /></div>
            <div><p className="font-bold text-gray-900">배송 추적</p><p className="text-sm text-gray-500">실시간 위치 · ETA 확인</p></div>
          </div>
        </Link>
        <Link href="/admin" className="block">
          <div className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-lg active:scale-95 transition-transform cursor-pointer">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center"><BarChart3 className="w-6 h-6 text-white" /></div>
            <div><p className="font-bold text-gray-900">관리자 대시보드</p><p className="text-sm text-gray-500">배송 현황 · 통계 분석</p></div>
          </div>
        </Link>
      </div>
      <p className="text-blue-300 text-xs mt-12 text-center">AI 경로 최적화 · 실시간 추적 · 자동 알림</p>
    </div>
  );
}
