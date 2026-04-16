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
    });

    if (!route) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const statusParam = request.nextUrl.searchParams.get('status');
    const statusFilter = statusParam
      ? statusParam.split(',').map((s) => s.trim())
      : undefined;

    const deliveries = await prisma.delivery.findMany({
      where: {
        routeId: route.id,
        ...(statusFilter ? { status: { in: statusFilter } } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: deliveries,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch deliveries' },
      { status: 500 }
    );
  }
}
