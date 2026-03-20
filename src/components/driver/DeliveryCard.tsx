'use client';
import { DeliveryItem } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MapPin, Package, Phone, Clock } from 'lucide-react';

interface Props {
  delivery: DeliveryItem;
  isActive?: boolean;
  onClick?: () => void;
}

export function DeliveryCard({ delivery, isActive, onClick }: Props) {
  const pkg = delivery.package;
  const clickable = delivery.status === 'pending' || delivery.status === 'in_progress';
  const fmtTime = (iso?: string) => iso ? new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-';
  const fmtDist = (m?: number) => !m ? '' : m >= 1000 ? `${(m/1000).toFixed(1)}km` : `${m}m`;

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200
        ${isActive ? 'border-blue-500 shadow-blue-100 shadow-md' : 'border-transparent'}
        ${clickable ? 'cursor-pointer active:scale-95' : 'opacity-60'}`}
      onClick={() => clickable && onClick?.()}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">{delivery.order}</span>
            <StatusBadge status={delivery.status} />
          </div>
          {delivery.status === 'in_progress' && <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">현재 배송지</span>}
        </div>

        <div className="flex items-start gap-2 mb-2">
          <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{pkg.address}</p>
            {pkg.addressDetail && <p className="text-sm text-gray-500">{pkg.addressDetail}</p>}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /><span>{pkg.recipientName}</span></div>
          <div className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /><span>{pkg.weight}kg</span></div>
          {!!delivery.durationFromPrev && delivery.durationFromPrev > 0 && (
            <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /><span>{delivery.durationFromPrev}분</span></div>
          )}
        </div>

        {delivery.status === 'pending' && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between">
            <span className="text-xs text-gray-400">예상 도착: {fmtTime(delivery.estimatedArrival)}</span>
            {!!delivery.distanceFromPrev && <span className="text-xs text-blue-500 font-medium">{fmtDist(delivery.distanceFromPrev)}</span>}
          </div>
        )}

        {pkg.specialInstructions && delivery.status !== 'completed' && (
          <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs text-amber-700">📌 {pkg.specialInstructions}</p>
          </div>
        )}

        {delivery.status === 'completed' && (
          <div className="mt-2 p-2 bg-emerald-50 rounded-lg flex justify-between">
            <span className="text-xs text-emerald-700">✓ 완료 ({delivery.proofType === 'pin' ? 'PIN' : delivery.proofType === 'photo' ? '사진' : '서명'})</span>
            <span className="text-xs text-gray-400">{delivery.completedAt ? new Date(delivery.completedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}
