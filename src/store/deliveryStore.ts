import { create } from 'zustand';
import { Driver, Route } from '@/types';
import { mockDriver, mockDeliveries, mockRoute } from '@/lib/mockData';

interface DeliveryStore {
  driver: Driver;
  route: Route;
  isOptimizing: boolean;
  setActiveDelivery: (id: string | null) => void;
  completeDelivery: (id: string, proofType: 'photo' | 'signature' | 'pin', proofData: string) => void;
  failDelivery: (id: string, reason: string) => void;
  optimizeRoute: () => Promise<void>;
}

export const useDeliveryStore = create<DeliveryStore>((set, get) => ({
  driver: mockDriver,
  route: { ...mockRoute, deliveries: [...mockDeliveries] },
  isOptimizing: false,

  setActiveDelivery: (_id) => {},

  completeDelivery: (id, proofType, proofData) => set(state => ({
    route: {
      ...state.route,
      deliveries: state.route.deliveries.map(d =>
        d.id === id ? { ...d, status: 'completed' as const, completedAt: new Date().toISOString(), proofType, proofData } : d
      ),
    },
    driver: { ...state.driver, todayCompleted: state.driver.todayCompleted + 1, estimatedEarnings: state.driver.estimatedEarnings + 3500 },
  })),

  failDelivery: (id, reason) => set(state => ({
    route: { ...state.route, deliveries: state.route.deliveries.map(d => d.id === id ? { ...d, status: 'failed' as const, failureReason: reason } : d) },
    driver: { ...state.driver, todayFailed: state.driver.todayFailed + 1 },
  })),

  optimizeRoute: async () => {
    const { driver, route } = get();
    set({ isOptimizing: true });
    try {
      const res = await fetch('/api/route-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveries: route.deliveries, driverLat: driver.currentLat, driverLng: driver.currentLng, vehicleType: driver.vehicleType }),
      });
      const data = await res.json();
      if (data.success) set(s => ({ route: { ...s.route, deliveries: data.data.optimizedDeliveries, totalDistance: data.data.totalDistance, estimatedDuration: data.data.estimatedDuration, optimized: true } }));
    } finally {
      set({ isOptimizing: false });
    }
  },
}));
