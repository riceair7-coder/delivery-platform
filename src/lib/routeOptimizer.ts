import { DeliveryItem } from '@/types';

interface OptimizationInput {
  deliveries: DeliveryItem[];
  driverLat: number;
  driverLng: number;
  vehicleType: 'motorcycle' | 'bicycle' | 'car' | 'van';
  trafficFactor?: number;
}

interface OptimizationResult {
  optimizedDeliveries: DeliveryItem[];
  totalDistance: number;
  estimatedDuration: number;
  savedTime: number;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getSpeedMps(vehicleType: string, trafficFactor = 1.0): number {
  const s: Record<string, number> = { motorcycle: 13.9, bicycle: 4.2, car: 8.3, van: 6.9 };
  return (s[vehicleType] || 8.3) / trafficFactor;
}

export function optimizeRoute(input: OptimizationInput): OptimizationResult {
  const { deliveries, driverLat, driverLng, vehicleType, trafficFactor = 1.0 } = input;
  const pending = deliveries.filter(d => d.status === 'pending' || d.status === 'in_progress');
  const done = deliveries.filter(d => d.status === 'completed' || d.status === 'cancelled' || d.status === 'failed');

  if (pending.length === 0) return { optimizedDeliveries: deliveries, totalDistance: 0, estimatedDuration: 0, savedTime: 0 };

  const unvisited = [...pending];
  const ordered: DeliveryItem[] = [];
  let lat = driverLat, lng = driverLng, total = 0;

  while (unvisited.length > 0) {
    let ni = 0, nd = Infinity;
    unvisited.forEach((d, i) => {
      const dist = haversineDistance(lat, lng, d.package.lat, d.package.lng);
      if (dist < nd) { nd = dist; ni = i; }
    });
    const n = unvisited.splice(ni, 1)[0];
    total += nd;
    ordered.push({ ...n, distanceFromPrev: Math.round(nd), durationFromPrev: Math.round(nd / getSpeedMps(vehicleType, trafficFactor) / 60) });
    lat = n.package.lat; lng = n.package.lng;
  }

  const dur = Math.round(total / getSpeedMps(vehicleType, trafficFactor));
  return {
    optimizedDeliveries: [...done, ...ordered.map((d, i) => ({ ...d, order: done.length + i + 1 }))],
    totalDistance: Math.round(total), estimatedDuration: dur, savedTime: Math.round(dur * 0.2),
  };
}
