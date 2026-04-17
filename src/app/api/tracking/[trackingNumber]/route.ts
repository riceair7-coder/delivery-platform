import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  try {
    const { trackingNumber } = await params;

    const delivery = await prisma.delivery.findUnique({
      where: { trackingNumber },
      include: {
        driver: {
          select: {
            currentLat: true,
            currentLng: true,
            updatedAt: true,
            name: true,
          },
        },
        route: {
          select: {
            totalDistance: true,
            estimatedDuration: true,
          },
        },
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {
      trackingNumber: delivery.trackingNumber,
      orderNumber: delivery.orderNumber,
      status: delivery.status,
      recipientName: delivery.recipientName,
      address: delivery.address,
      addressDetail: delivery.addressDetail,
      lat: delivery.lat,
      lng: delivery.lng,
      estimatedArrival: delivery.estimatedArrival,
      completedAt: delivery.completedAt,
      proofType: delivery.proofType,
      sortOrder: delivery.sortOrder,
      distanceFromPrev: delivery.distanceFromPrev,
      durationFromPrev: delivery.durationFromPrev,
    };

    if (delivery.status === 'in_progress' && delivery.driver) {
      data.driverLocation = {
        lat: delivery.driver.currentLat,
        lng: delivery.driver.currentLng,
        updatedAt: delivery.driver.updatedAt?.toISOString(),
        driverName: delivery.driver.name,
      };
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch tracking info' },
      { status: 500 }
    );
  }
}
