/**
 * ERP API Client — slogis.kr 연동
 *
 * ERP API: https://slogis.kr/api/deliveries.php
 * Parameters: driver_id, date (YYYY-MM-DD)
 *
 * 응답 형식:
 * {
 *   "driver_id": "10",
 *   "date": "2026-04-16",
 *   "deliveries": [
 *     {
 *       "id": "ERP-001",
 *       "address": "서울시 마포구 홍익로 15",
 *       "address_detail": "302호",
 *       "recipient_name": "이민지",
 *       "recipient_phone": "010-2345-6789",
 *       "note": "부재 시 경비실 맡겨주세요"
 *     }
 *   ],
 *   "total_count": 1
 * }
 */

const ERP_BASE_URL = 'https://slogis.kr/api/deliveries.php';

export interface ErpDelivery {
  id: string;
  address: string;
  address_detail: string;
  recipient_name: string;
  recipient_phone: string;
  note: string;
}

export interface ErpResponse {
  driver_id: string;
  date: string;
  deliveries: ErpDelivery[];
  total_count: number;
}

export async function fetchErpDeliveries(driverId: string, date: string): Promise<ErpResponse> {
  const url = `${ERP_BASE_URL}?driver_id=${encodeURIComponent(driverId)}&date=${encodeURIComponent(date)}`;

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    // 10초 타임아웃
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`ERP API error: ${res.status} ${res.statusText}`);
  }

  const data: ErpResponse = await res.json();
  return data;
}
