import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/drivers/[id]
 * 특정 기사 상세 조회
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        _count: {
          select: { routes: true, deliveries: true },
        },
      },
    });
    if (!driver) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: driver });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/drivers/[id]
 * 기사 정보 수정
 * Body: { name?, phone?, vehicleType?, vehicleNumber?, isOnline? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phone, vehicleType, vehicleNumber, isOnline } = body;

    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 전화번호 변경 시 중복 체크
    if (phone && phone !== driver.phone) {
      const dup = await prisma.driver.findUnique({ where: { phone } });
      if (dup) {
        return NextResponse.json(
          { error: `이미 사용 중인 전화번호: ${phone}` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.driver.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(vehicleType !== undefined && { vehicleType }),
        ...(vehicleNumber !== undefined && { vehicleNumber }),
        ...(isOnline !== undefined && { isOnline }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/drivers/[id]
 * 기사 삭제
 * 배송/경로가 있으면 거부 (?force=true 로 강제 삭제 가능)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const driver = await prisma.driver.findUnique({
      where: { id },
      include: { _count: { select: { routes: true, deliveries: true } } },
    });
    if (!driver) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const hasData = driver._count.routes > 0 || driver._count.deliveries > 0;

    if (hasData && !force) {
      return NextResponse.json(
        {
          error: `배송 ${driver._count.deliveries}건, 경로 ${driver._count.routes}개가 있습니다. 강제 삭제하려면 force=true`,
          counts: { routes: driver._count.routes, deliveries: driver._count.deliveries },
        },
        { status: 409 }
      );
    }

    if (force && hasData) {
      // Cascade: delivery → route → driver 순으로 삭제
      await prisma.$transaction([
        prisma.delivery.deleteMany({ where: { driverId: id } }),
        prisma.route.deleteMany({ where: { driverId: id } }),
        prisma.driver.delete({ where: { id } }),
      ]);
    } else {
      await prisma.driver.delete({ where: { id } });
    }

    return NextResponse.json({
      success: true,
      data: { deletedId: id, forced: force && hasData },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}
