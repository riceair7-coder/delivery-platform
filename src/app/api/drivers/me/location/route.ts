import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateDriver } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const driver = await authenticateDriver(request);
    if (!driver) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { lat, lng } = await request.json();

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'lat and lng must be numbers' },
        { status: 400 }
      );
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        currentLat: lat,
        currentLng: lng,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedDriver.id,
        currentLat: updatedDriver.currentLat,
        currentLng: updatedDriver.currentLng,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}
