'use client';
import { useDeliveryStore } from '@/store/deliveryStore';
import { Zap, Loader2, CheckCircle } from 'lucide-react';

export function RouteOptimizeButton() {
  const { optimizeRoute, isOptimizing, route, lastOptimization } = useDeliveryStore();
  if (!route) return null;
  const pending = route.deliveries.filter(d => d.status === 'pending').length;

  if (pending < 2) return null;

  // 최적화 완료 후 절감 결과 표시
  if (lastOptimization && lastOptimization.savedTimePercent > 0 && route.optimized) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{Math.round(lastOptimization.savedTimePercent)}% 단축</span>
        </div>
        <button onClick={optimizeRoute} disabled={isOptimizing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium active:scale-95 transition-transform disabled:opacity-70">
          {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          <span>재최적화</span>
        </button>
      </div>
    );
  }

  return (
    <button onClick={optimizeRoute} disabled={isOptimizing}
      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium shadow-lg shadow-blue-200 active:scale-95 transition-transform disabled:opacity-70">
      {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
      <span>{isOptimizing ? '최적화 중...' : 'AI 경로 최적화'}</span>
    </button>
  );
}
