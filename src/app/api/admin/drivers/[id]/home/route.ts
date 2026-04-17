import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { geocodeAddress } from '@/lib/geocoder';

/**
 * PUT /api/admin/drivers/[id]/home
 * 관리자가 기사의 종점(집) 설정
 *
 * Body: { address: string, lat?: number, lng?: number }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { address, lat, lng } = await request.json();

    if (!address) {
      return NextResponse.json({ error: 'address is required' }, { status: 400 });
    }

    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    let homeLat = typeof lat === 'number' ? lat : undefined;
    let homeLng = typeof lng === 'number' ? lng : undefined;

    if (homeLat === undefined || homeLng === undefined) {
      const geo = await geocodeAddress(address);
      homeLat = geo?.lat ?? 0;
      homeLng = geo?.lng ?? 0;
    }

    const updated = await prisma.driver.update({
      where: { id },
      data: {
        homeAddress: address,
        homeLat,
        homeLng,
      },
      select: {
        id: true,
        name: true,
        homeAddress: true,
        homeLat: true,
        homeLng: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}
