'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDeliveryStore } from '@/store/deliveryStore';
import { Truck, Loader2 } from 'lucide-react';

export default function DriverLoginPage() {
  const router = useRouter();
  const { login, isLoading } = useDeliveryStore();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(phone);
      router.replace('/driver');
    } catch (err: any) {
      setError(err.message || '로그인 실패');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">배송 기사 앱</h1>
          <p className="text-gray-400 mt-1">전화번호로 로그인하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="전화번호 (예: 010-1234-5678)"
              className="w-full px-4 py-3.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-center text-lg tracking-wide"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!phone || isLoading}
            className="w-full py-3.5 bg-blue-500 text-white rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-gray-600 text-xs text-center mt-6">
          테스트: 010-1234-5678
        </p>
      </div>
    </div>
  );
}
