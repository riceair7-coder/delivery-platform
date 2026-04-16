'use client';
import { useState } from 'react';
import { useDeliveryStore } from '@/store/deliveryStore';
import { DriverHeader } from '@/components/driver/DriverHeader';
import { DeliveryCard } from '@/components/driver/DeliveryCard';
import { CompleteModal } from '@/components/driver/CompleteModal';
import { RouteOptimizeButton } from '@/components/driver/RouteOptimizeButton';
import { RouteMap } from '@/components/driver/RouteMap';
import { Navigation, MapIcon, List } from 'lucide-react';

export default function DriverPage() {
  const { route } = useDeliveryStore();
  const [modal, setModal] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const current = route.deliveries.find(d => d.status === 'in_progress');

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
        <RouteOptimizeButton />
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
          {[...route.deliveries].sort((a, b) => a.order - b.order).map(d => (
            <DeliveryCard key={d.id} delivery={d} isActive={d.status === 'in_progress'} onClick={() => setModal(d.id)} />
          ))}
        </div>
      )}

      {view === 'map' && <RouteMap />}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex justify-around max-w-md mx-auto">
          {[{ label: '배송목록', Icon: List, v: 'list' }, { label: '내비게이션', Icon: Navigation, v: 'nav' }, { label: '지도', Icon: MapIcon, v: 'map' }].map(({ label, Icon, v }) => (
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
