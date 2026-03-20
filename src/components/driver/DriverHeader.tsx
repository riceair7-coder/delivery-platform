'use client';
import { useDeliveryStore } from '@/store/deliveryStore';

export function DriverHeader() {
  const { driver, route } = useDeliveryStore();
  const completed = route.deliveries.filter(d => d.status === 'completed').length;
  const total = route.deliveries.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <header className="bg-gray-900 text-white px-4 pt-12 pb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400">배송기사</p>
          <h1 className="text-lg font-bold">{driver.name}</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">예상 수입</p>
          <p className="text-lg font-bold text-emerald-400">₩{driver.estimatedEarnings.toLocaleString()}</p>
        </div>
      </div>
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>진행률</span><span>{completed}/{total} 완료</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-emerald-400">{driver.todayCompleted}</p>
          <p className="text-xs text-gray-400">완료</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-amber-400">{total - completed}</p>
          <p className="text-xs text-gray-400">남은 배송</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-red-400">{driver.todayFailed}</p>
          <p className="text-xs text-gray-400">실패</p>
        </div>
      </div>
    </header>
  );
}
