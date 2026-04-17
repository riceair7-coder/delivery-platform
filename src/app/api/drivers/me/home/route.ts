import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateDriver } from '@/lib/auth';
import { geocodeAddress } from '@/lib/geocoder';

/**
 * PUT /api/drivers/me/home
 * 기사가 본인 종점(집) 설정
 *
 * Body: { address: string, lat?: number, lng?: number }
 *  - lat/lng 없으면 주소 → 좌표 자동 변환
 */
export async function PUT(request: NextRequest) {
  try {
    const driver = await authenticateDriver(request);
    if (!driver) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { address, lat, lng } = await request.json();
    if (!address) {
      return NextResponse.json({ error: 'address is required' }, { status: 400 });
    }

    let homeLat = typeof lat === 'number' ? lat : undefined;
    let homeLng = typeof lng === 'number' ? lng : undefined;

    // 좌표 없으면 지오코딩
    if (homeLat === undefined || homeLng === undefined) {
      const geo = await geocodeAddress(address);
      homeLat = geo?.lat ?? 0;
      homeLng = geo?.lng ?? 0;
    }

    const updated = await prisma.driver.update({
      where: { id: driver.id },
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
