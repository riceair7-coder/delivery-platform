import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateDriver } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const driver = await authenticateDriver(request);
    if (!driver) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const route = await prisma.route.findUnique({
      where: {
        driverId_date: {
          driverId: driver.id,
          date: today,
        },
      },
      include: {
        deliveries: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!route) {
      return NextResponse.json(
        { error: 'No route found for today' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: route,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch today\'s route' },
      { status: 500 }
    );
  }
}
