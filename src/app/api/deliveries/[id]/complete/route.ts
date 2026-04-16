import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateDriver } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const driver = await authenticateDriver(request);
    if (!driver) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { proofType, proofData, pinCode, failureReason } = await request.json();

    const delivery = await prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      );
    }

    if (delivery.driverId !== driver.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Verify PIN if proofType is 'pin'
    if (proofType === 'pin') {
      if (!pinCode || pinCode !== delivery.pinCode) {
        return NextResponse.json(
          { error: 'Invalid PIN code' },
          { status: 400 }
        );
      }
    }

    const isFailed = !!failureReason;
    const status = isFailed ? 'failed' : 'completed';

    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: {
        status,
        completedAt: new Date(),
        proofType,
        proofData: proofData ?? null,
        failureReason: failureReason ?? null,
      },
    });

    // Auto-advance: set the next delivery to in_progress
    if (!isFailed && delivery.routeId) {
      const nextDelivery = await prisma.delivery.findFirst({
        where: {
          routeId: delivery.routeId,
          sortOrder: { gt: delivery.sortOrder },
          status: 'pending',
        },
        orderBy: { sortOrder: 'asc' },
      });

      if (nextDelivery) {
        await prisma.delivery.update({
          where: { id: nextDelivery.id },
          data: { status: 'in_progress' },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedDelivery,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to complete delivery' },
      { status: 500 }
    );
  }
}
