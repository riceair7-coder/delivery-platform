'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDeliveryStore } from '@/store/deliveryStore';
import { DriverHeader } from '@/components/driver/DriverHeader';
import { DeliveryCard } from '@/components/driver/DeliveryCard';
import { CompleteModal } from '@/components/driver/CompleteModal';
import { RouteOptimizeButton } from '@/components/driver/RouteOptimizeButton';
import { RouteMap } from '@/components/driver/RouteMap';
import { Navigation, MapIcon, List, Loader2, LogOut } from 'lucide-react';

export default function DriverPage() {
  const router = useRouter();
  const { route, driver, isLoading, isAuthenticated, error, loadData, logout, startLocationTracking, stopLocationTracking } = useDeliveryStore();
  const [modal, setModal] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');

  // Auth check + data loading
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/driver/login');
      return;
    }
    loadData();
    startLocationTracking();
    return () => stopLocationTracking();
  }, [isAuthenticated]);

  // Redirect if auth lost
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/driver/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  if (isLoading || !route || !driver) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error && !route.deliveries.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">{error}</p>
          <button onClick={loadData} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">다시 시도</button>
        </div>
      </div>
    );
  }

  const current = route.deliveries.find(d => d.status === 'in_progress');
  const sortedDeliveries = [...route.deliveries].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DriverHeader />

      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex bg-white rounded-xl border border-gray-200 p-1">
          {(['list', 'map'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === v ? 'bg-blue-500 text-white' : 'text-gray-500'}`}>
              {v === 'list' ? <><List className="w-4 h-4" />목록</> : <><MapIcon className="w-4 h-4" />지도</>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <RouteOptimizeButton />
          <button onClick={() => { logout(); router.replace('/driver/login'); }}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="로그아웃">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {current && view === 'list' && (
        <div className="px-4 mb-2">
          <div className="p-3 bg-blue-500 text-white rounded-xl flex items-center gap-3">
            <Navigation className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs opacity-80">지금 배송중</p>
              <p className="font-bold truncate">{current.package.address}</p>
            </div>
            <button onClick={() => setModal(current.id)} className="bg-white text-blue-500 px-3 py-1.5 rounded-lg text-sm font-bold flex-shrink-0">완료</button>
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="flex-1 px-4 space-y-3 pb-24">
          {sortedDeliveries.map(d => (
            <DeliveryCard key={d.id} delivery={d} isActive={d.status === 'in_progress'} onClick={() => setModal(d.id)} />
          ))}
        </div>
      )}

      {view === 'map' && <RouteMap />}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex justify-around max-w-md mx-auto">
          {[
            { label: '배송목록', Icon: List, v: 'list' },
            { label: '내비게이션', Icon: Navigation, v: 'nav' },
            { label: '지도', Icon: MapIcon, v: 'map' },
          ].map(({ label, Icon, v }) => (
            <button key={label} onClick={() => v !== 'nav' && setView(v as 'list' | 'map')}
              className={`flex flex-col items-center gap-1 ${view === v ? 'text-blue-500' : 'text-gray-400'}`}>
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {modal && <CompleteModal deliveryId={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
