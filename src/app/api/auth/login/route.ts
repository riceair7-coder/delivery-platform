import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const driver = await prisma.driver.findUnique({
      where: { phone },
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 401 }
      );
    }

    const token = randomBytes(32).toString('hex');

    const updatedDriver = await prisma.driver.update({
      where: { id: driver.id },
      data: { token },
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        driver: {
          id: updatedDriver.id,
          name: updatedDriver.name,
          phone: updatedDriver.phone,
          vehicleType: updatedDriver.vehicleType,
          vehicleNumber: updatedDriver.vehicleNumber,
        },
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
