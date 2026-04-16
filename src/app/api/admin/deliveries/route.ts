import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const statusParam = searchParams.get('status');
    const driverParam = searchParams.get('driver');
    const dateParam = searchParams.get('date');

    const date = dateParam || new Date().toISOString().split('T')[0];

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Filter by status
    if (statusParam) {
      const statuses = statusParam.split(',').map((s) => s.trim());
      where.status = { in: statuses };
    }

    // Filter by driver
    if (driverParam) {
      where.driverId = driverParam;
    }

    // Filter by date via route
    where.route = {
      date: date,
    };

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        route: {
          select: {
            id: true,
            date: true,
            driverId: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: deliveries,
    });
  } catch (error) {
    console.error('Admin deliveries API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deliveries' },
      { status: 500 }
    );
  }
}
