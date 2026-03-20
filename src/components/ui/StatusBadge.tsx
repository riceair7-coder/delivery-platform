import { DeliveryStatus } from '@/types';

const cfg: Record<DeliveryStatus, { label: string; cls: string }> = {
  pending: { label: '대기', cls: 'bg-gray-100 text-gray-600' },
  in_progress: { label: '배송중', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: '완료', cls: 'bg-emerald-100 text-emerald-700' },
  failed: { label: '실패', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: '취소', cls: 'bg-gray-100 text-gray-400' },
};

export function StatusBadge({ status }: { status: DeliveryStatus }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg[status].cls}`}>{cfg[status].label}</span>;
}
