import { create } from 'zustand';
import { Driver, Route, DeliveryItem } from '@/types';
import * as api from '@/lib/api';

interface OptimizationResult {
  savedTime: number;
  savedTimePercent: number;
  originalDuration: number;
  processingTime: number;
  apiCalls: number;
}

interface DeliveryStore {
  // State
  driver: Driver | null;
  route: Route | null;
  isLoading: boolean;
  isOptimizing: boolean;
  isAuthenticated: boolean;
  lastOptimization: OptimizationResult | null;
  error: string | null;

  // Auth
  login: (phone: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;

  // Data
  loadData: () => Promise<void>;
  refreshDeliveries: () => Promise<void>;

  // Actions
  completeDelivery: (id: string, proofType: 'photo' | 'signature' | 'pin', proofData: string) => Promise<void>;
  failDelivery: (id: string, reason: string) => Promise<void>;
  optimizeRoute: () => Promise<void>;

  // Location
  startLocationTracking: () => void;
  stopLocationTracking: () => void;
}

// DB 배송 레코드 → 프론트엔드 DeliveryItem 변환
function toDeliveryItem(d: any): DeliveryItem {
  return {
    id: d.id,
    package: {
      id: d.id,
      trackingNumber: d.trackingNumber,
      recipientName: d.recipientName,
      recipientPhone: d.recipientPhone,
      address: d.address,
      addressDetail: d.addressDetail || '',
      lat: d.lat,
      lng: d.lng,
      weight: d.weight,
      volume: d.volume,
      specialInstructions: d.specialInstructions || undefined,
      pinCode: d.pinCode || undefined,
    },
    status: d.status,
    order: d.sortOrder,
    estimatedArrival: d.estimatedArrival || undefined,
    completedAt: d.completedAt || undefined,
    proofType: d.proofType || undefined,
    proofData: d.proofData || undefined,
    failureReason: d.failureReason || undefined,
    distanceFromPrev: d.distanceFromPrev,
    durationFromPrev: d.durationFromPrev,
  };
}

function toDriver(d: any, deliveries: DeliveryItem[]): Driver {
  const completed = deliveries.filter(x => x.status === 'completed').length;
  const failed = deliveries.filter(x => x.status === 'failed').length;
  return {
    id: d.id,
    name: d.name,
    phone: d.phone,
    vehicleType: d.vehicleType,
    vehicleNumber: d.vehicleNumber,
    currentLat: d.currentLat,
    currentLng: d.currentLng,
    homeAddress: d.homeAddress || undefined,
    homeLat: d.homeLat || undefined,
    homeLng: d.homeLng || undefined,
    isOnline: d.isOnline,
    todayCompleted: completed,
    todayFailed: failed,
    estimatedEarnings: completed * 3500,
  };
}

let locationWatchId: number | null = null;

export const useDeliveryStore = create<DeliveryStore>((set, get) => ({
  driver: null,
  route: null,
  isLoading: false,
  isOptimizing: false,
  isAuthenticated: false, // 초기값 false (SSR 동일 보장) — mount 시 checkAuth로 반영
  lastOptimization: null,
  error: null,

  login: async (phone) => {
    set({ isLoading: true, error: null });
    try {
      const { driver } = await api.login(phone);
      set({ isAuthenticated: true, isLoading: false });
      // loadData will be called after redirect
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  logout: () => {
    api.clearToken();
    get().stopLocationTracking();
    set({ driver: null, route: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    if (!api.getToken()) {
      set({ isAuthenticated: false });
      return false;
    }
    try {
      await api.getMe();
      set({ isAuthenticated: true });
      return true;
    } catch {
      set({ isAuthenticated: false });
      return false;
    }
  },

  loadData: async () => {
    set({ isLoading: true, error: null });
    try {
      const routeData = await api.getTodayRoute();
      const deliveries = (routeData.deliveries || []).map(toDeliveryItem);
      const driverData = await api.getMe();

      set({
        driver: toDriver(driverData, deliveries),
        route: {
          id: routeData.id,
          driverId: routeData.driverId,
          date: routeData.date,
          deliveries,
          totalDistance: routeData.totalDistance,
          estimatedDuration: routeData.estimatedDuration,
          optimized: routeData.optimized,
          startTime: routeData.startTime || undefined,
          endTime: routeData.endTime || undefined,
        },
        isLoading: false,
      });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  refreshDeliveries: async () => {
    try {
      const routeData = await api.getTodayRoute();
      const deliveries = (routeData.deliveries || []).map(toDeliveryItem);
      set(s => ({
        route: s.route ? { ...s.route, deliveries } : null,
        driver: s.driver ? {
          ...s.driver,
          todayCompleted: deliveries.filter((d: DeliveryItem) => d.status === 'completed').length,
          todayFailed: deliveries.filter((d: DeliveryItem) => d.status === 'failed').length,
          estimatedEarnings: deliveries.filter((d: DeliveryItem) => d.status === 'completed').length * 3500,
        } : null,
      }));
    } catch (e: any) {
      console.error('Failed to refresh deliveries:', e);
    }
  },

  completeDelivery: async (id, proofType, proofData) => {
    try {
      await api.completeDelivery(id, {
        proofType,
        proofData,
        pinCode: proofType === 'pin' ? proofData : undefined,
      });
      // Refresh from server to get updated state
      await get().refreshDeliveries();
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  failDelivery: async (id, reason) => {
    try {
      await api.completeDelivery(id, {
        proofType: 'photo',
        failureReason: reason,
      });
      await get().refreshDeliveries();
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  optimizeRoute: async () => {
    const { driver, route } = get();
    if (!driver || !route) return;
    set({ isOptimizing: true });
    try {
      const res = await fetch('/api/route-optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api.getToken()}`,
        },
        body: JSON.stringify({
          deliveries: route.deliveries,
          vehicleType: driver.vehicleType,
          driverHomeLat: driver.homeLat,
          driverHomeLng: driver.homeLng,
          driverHomeAddress: driver.homeAddress,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const opt = data.data;

        // 1. 로컬 상태 즉시 업데이트
        set(s => ({
          route: s.route ? {
            ...s.route,
            deliveries: opt.optimizedDeliveries,
            totalDistance: opt.totalDistance,
            estimatedDuration: opt.estimatedDuration,
            optimized: true,
          } : null,
          lastOptimization: {
            savedTime: opt.savedTime || 0,
            savedTimePercent: opt.savedTimePercent || 0,
            originalDuration: opt.originalDuration || 0,
            processingTime: opt.processingTime || 0,
            apiCalls: opt.apiCalls || 0,
          },
        }));

        // 2. DB에 저장 (비동기, 실패해도 UI는 이미 반영됨)
        try {
          await fetch('/api/routes/optimize-save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${api.getToken()}`,
            },
            body: JSON.stringify({
              routeId: route.id,
              totalDistance: opt.totalDistance,
              estimatedDuration: opt.estimatedDuration,
              deliveries: opt.optimizedDeliveries.map((d: any) => ({
                id: d.id,
                sortOrder: d.order,
                distanceFromPrev: d.distanceFromPrev ?? 0,
                durationFromPrev: d.durationFromPrev ?? 0,
                estimatedArrival: d.estimatedArrival,
              })),
            }),
          });
        } catch (saveErr) {
          console.error('Failed to persist optimization:', saveErr);
        }
      }
    } finally {
      set({ isOptimizing: false });
    }
  },

  startLocationTracking: () => {
    if (locationWatchId !== null) return;
    if (!navigator.geolocation) return;

    locationWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // Update server
        api.updateLocation(latitude, longitude).catch(console.error);
        // Update local state
        set(s => ({
          driver: s.driver ? { ...s.driver, currentLat: latitude, currentLng: longitude } : null,
        }));
      },
      (err) => console.error('Location error:', err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
  },

  stopLocationTracking: () => {
    if (locationWatchId !== null) {
      navigator.geolocation.clearWatch(locationWatchId);
      locationWatchId = null;
    }
  },
}));
