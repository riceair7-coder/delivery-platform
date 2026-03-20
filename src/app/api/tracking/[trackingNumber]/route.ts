import { NextRequest, NextResponse } from 'next/server';
import { mockDeliveries, mockDriver } from '@/lib/mockData';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  const { trackingNumber } = await params;
  const d = mockDeliveries.find(x => x.package.trackingNumber === trackingNumber);
  if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: {
    trackingNumber: d.package.trackingNumber, status: d.status,
    recipientName: d.package.recipientName, address: d.package.address,
    estimatedArrival: d.estimatedArrival, completedAt: d.completedAt,
    driverLocation: d.status === 'in_progress' ? { lat: mockDriver.currentLat, lng: mockDriver.currentLng, updatedAt: new Date().toISOString() } : null,
  }});
}
