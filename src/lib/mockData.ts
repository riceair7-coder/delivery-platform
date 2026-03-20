import { Driver, Route, DeliveryItem, Package } from '@/types';

export const mockDriver: Driver = {
  id: 'drv_001', name: '김배달', phone: '010-1234-5678',
  vehicleType: 'motorcycle', vehicleNumber: '서울 가 1234',
  currentLat: 37.5665, currentLng: 126.9780,
  isOnline: true, todayCompleted: 8, todayFailed: 1, estimatedEarnings: 42000,
};

const packages: Package[] = [
  { id: 'pkg_001', trackingNumber: 'DL20260319001', recipientName: '이민지', recipientPhone: '010-2345-6789', address: '서울시 마포구 홍익로 15', addressDetail: '302호', lat: 37.5506, lng: 126.9239, weight: 1.2, volume: 500, specialInstructions: '부재 시 경비실 맡겨주세요', pinCode: '7823' },
  { id: 'pkg_002', trackingNumber: 'DL20260319002', recipientName: '박준혁', recipientPhone: '010-3456-7890', address: '서울시 마포구 와우산로 94', addressDetail: '1층', lat: 37.5532, lng: 126.9254, weight: 3.5, volume: 2000 },
  { id: 'pkg_003', trackingNumber: 'DL20260319003', recipientName: '최수진', recipientPhone: '010-4567-8901', address: '서울시 서대문구 연세로 50', addressDetail: '상가 B동', lat: 37.5659, lng: 126.9397, weight: 0.8, volume: 300, specialInstructions: '문 앞에 놔두세요' },
  { id: 'pkg_004', trackingNumber: 'DL20260319004', recipientName: '정대현', recipientPhone: '010-5678-9012', address: '서울시 은평구 진관3로 15-20', addressDetail: '204호', lat: 37.6208, lng: 126.9165, weight: 2.1, volume: 1200 },
  { id: 'pkg_005', trackingNumber: 'DL20260319005', recipientName: '한소연', recipientPhone: '010-6789-0123', address: '서울시 마포구 성미산로 153', addressDetail: '501호', lat: 37.5583, lng: 126.9171, weight: 0.5, volume: 200, pinCode: '4521' },
];

export const mockDeliveries: DeliveryItem[] = packages.map((pkg, index) => ({
  id: `del_${String(index + 1).padStart(3, '0')}`,
  package: pkg,
  status: (index === 0 ? 'completed' : index === 1 ? 'in_progress' : 'pending') as DeliveryItem['status'],
  order: index + 1,
  estimatedArrival: new Date(Date.now() + (index + 1) * 20 * 60 * 1000).toISOString(),
  completedAt: index === 0 ? new Date(Date.now() - 30 * 60 * 1000).toISOString() : undefined,
  proofType: index === 0 ? 'pin' : undefined,
  distanceFromPrev: [0, 1200, 800, 3500, 1100][index],
  durationFromPrev: [0, 5, 4, 15, 6][index],
}));

export const mockRoute: Route = {
  id: 'route_001', driverId: 'drv_001',
  date: new Date().toISOString().split('T')[0],
  deliveries: mockDeliveries, totalDistance: 8500,
  estimatedDuration: 5400, optimized: true,
  startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};
