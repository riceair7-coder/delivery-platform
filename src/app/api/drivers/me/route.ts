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

    const driverWithRelations = await prisma.driver.findUnique({
      where: { id: driver.id },
      include: {
        routes: {
          where: { date: today },
          include: {
            deliveries: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: driverWithRelations,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch driver info' },
      { status: 500 }
    );
  }
}
