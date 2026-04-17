'use client';
import { useState } from 'react';
import { useDeliveryStore } from '@/store/deliveryStore';
import { X, Camera, PenLine, Hash, AlertTriangle, Loader2 } from 'lucide-react';

type Mode = 'select' | 'photo' | 'pin' | 'fail';

export function CompleteModal({ deliveryId, onClose }: { deliveryId: string; onClose: () => void }) {
  const { route, completeDelivery, failDelivery } = useDeliveryStore();
  const delivery = route?.deliveries.find(d => d.id === deliveryId);
  const [mode, setMode] = useState<Mode>('select');
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!delivery) return null;

  const handleComplete = async (proofType: 'photo' | 'signature' | 'pin', proofData: string) => {
    setSubmitting(true);
    setError('');
    try {
      await completeDelivery(deliveryId, proofType, proofData);
      onClose();
    } catch (e: any) {
      setError(e.message || '처리 실패');
      setSubmitting(false);
    }
  };

  const handleFail = async () => {
    if (!reason) return;
    setSubmitting(true);
    setError('');
    try {
      await failDelivery(deliveryId, reason);
      onClose();
    } catch (e: any) {
      setError(e.message || '처리 실패');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full rounded-t-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">배송 처리</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg mb-4">
          {delivery.package.orderNumber && (
            <p className="text-xs text-blue-600 font-bold mb-1">주문번호 {delivery.package.orderNumber}</p>
          )}
          <p className="font-medium">{delivery.package.address}</p>
          <p className="text-sm text-gray-500">{delivery.package.recipientName}</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg mb-4">{error}</div>
        )}

        {mode === 'select' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-600">증빙 방법 선택</p>
            <button onClick={() => setMode('photo')} disabled={submitting}
              className="w-full flex gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50">
              <Camera className="w-6 h-6 text-blue-500" />
              <div className="text-left"><p className="font-medium">사진 촬영</p><p className="text-xs text-gray-500">배송 완료 사진</p></div>
            </button>
            <button onClick={() => handleComplete('signature', 'signed')} disabled={submitting}
              className="w-full flex gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50">
              {submitting ? <Loader2 className="w-6 h-6 text-blue-500 animate-spin" /> : <PenLine className="w-6 h-6 text-blue-500" />}
              <div className="text-left"><p className="font-medium">서명 완료</p><p className="text-xs text-gray-500">수령인 서명 확인</p></div>
            </button>
            {delivery.package.pinCode && (
              <button onClick={() => setMode('pin')} disabled={submitting}
                className="w-full flex gap-3 p-4 border-2 border-emerald-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors disabled:opacity-50">
                <Hash className="w-6 h-6 text-emerald-500" />
                <div className="text-left"><p className="font-medium">PIN 확인</p><p className="text-xs text-gray-500">고객 PIN 입력</p></div>
              </button>
            )}
            <button onClick={() => setMode('fail')} disabled={submitting}
              className="w-full flex gap-3 p-4 border-2 border-red-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <div className="text-left"><p className="font-medium text-red-600">배송 불가</p><p className="text-xs text-gray-500">부재, 주소 오류 등</p></div>
            </button>
          </div>
        )}

        {mode === 'photo' && (
          <div className="space-y-4">
            <div className="h-40 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center">
                <Camera className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <input type="file" accept="image/*" capture="environment" className="hidden" id="cam"
                  onChange={e => { if (e.target.files?.[0]) handleComplete('photo', 'captured'); }} />
                <label htmlFor="cam" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm cursor-pointer">
                  {submitting ? '처리 중...' : '사진 찍기'}
                </label>
              </div>
            </div>
            <button onClick={() => setMode('select')} className="w-full py-3 text-gray-500 border border-gray-200 rounded-xl">뒤로</button>
          </div>
        )}

        {mode === 'pin' && (
          <div className="space-y-4">
            <div className="text-center p-3 bg-emerald-50 rounded-xl">
              <p className="text-sm text-gray-600">고객 PIN 번호를 입력받아 확인하세요</p>
            </div>
            <input type="number" value={pin} onChange={e => setPin(e.target.value)} placeholder="PIN 번호 입력"
              className="w-full text-center text-2xl tracking-widest border-2 border-gray-200 rounded-xl p-4 focus:border-blue-500 outline-none" />
            <button onClick={() => handleComplete('pin', pin)}
              disabled={pin.length < 4 || submitting}
              className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {submitting ? '확인 중...' : '확인 완료'}
            </button>
            <button onClick={() => setMode('select')} className="w-full py-3 text-gray-500 border border-gray-200 rounded-xl">뒤로</button>
          </div>
        )}

        {mode === 'fail' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">배송 불가 사유</p>
            {['수취인 부재', '주소 오류', '건물 진입 불가', '수취인 거부', '기타'].map(r => (
              <button key={r} onClick={() => setReason(r)}
                className={`w-full p-3 text-left rounded-xl border-2 transition-colors ${reason === r ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>{r}</button>
            ))}
            <button onClick={handleFail} disabled={!reason || submitting}
              className="w-full py-4 bg-red-500 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {submitting ? '처리 중...' : '배송 불가 처리'}
            </button>
            <button onClick={() => setMode('select')} className="w-full py-3 text-gray-500 border border-gray-200 rounded-xl">뒤로</button>
          </div>
        )}
      </div>
    </div>
  );
}
