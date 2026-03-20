'use client';
import { useDeliveryStore } from '@/store/deliveryStore';
import { Zap, Loader2 } from 'lucide-react';

export function RouteOptimizeButton() {
  const { optimizeRoute, isOptimizing, route } = useDeliveryStore();
  const pending = route.deliveries.filter(d => d.status === 'pending').length;
  if (pending < 2) return null;
  return (
    <button onClick={optimizeRoute} disabled={isOptimizing}
      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium shadow-lg shadow-blue-200 active:scale-95 transition-transform disabled:opacity-70">
      {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
      <span>{isOptimizing ? '최적화 중...' : 'AI 경로 최적화'}</span>
    </button>
  );
}
