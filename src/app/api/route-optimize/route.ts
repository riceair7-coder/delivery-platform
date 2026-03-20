import { NextRequest, NextResponse } from 'next/server';
import { optimizeRoute } from '@/lib/routeOptimizer';
import { DeliveryItem } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { deliveries, driverLat, driverLng, vehicleType, trafficFactor } = await request.json();
    if (!Array.isArray(deliveries)) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
    const result = optimizeRoute({ deliveries: deliveries as DeliveryItem[], driverLat: driverLat || 37.5665, driverLng: driverLng || 126.9780, vehicleType: vehicleType || 'motorcycle', trafficFactor: trafficFactor || 1.0 });
    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
