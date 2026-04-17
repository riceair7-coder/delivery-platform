import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/deliveries
 *
 * Query params:
 *  - status=pending,completed     (배송 상태, 콤마 구분 다중)
 *  - driver=drv_001                (기사 ID)
 *  - date=2026-04-17               (특정 날짜 — dateFrom/dateTo와 동시 불가)
 *  - dateFrom=2026-04-10           (시작일 포함)
 *  - dateTo=2026-04-17             (종료일 포함)
 *  - keyword=유정아                (주문번호/수령인명/전화번호/추적번호/주소 통합 검색)
 *  - limit=200                     (최대 결과 수, 기본 500)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const statusParam = searchParams.get('status');
    const driverParam = searchParams.get('driver');
    const dateParam = searchParams.get('date');
    const dateFromParam = searchParams.get('dateFrom');
    const dateToParam = searchParams.get('dateTo');
    const keyword = (searchParams.get('keyword') || '').trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10), 2000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // 상태 필터
    if (statusParam) {
      const statuses = statusParam.split(',').map((s) => s.trim()).filter(Boolean);
      if (statuses.length > 0) where.status = { in: statuses };
    }

    // 기사 필터
    if (driverParam) where.driverId = driverParam;

    // 날짜 필터 (route.date 기준)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routeFilter: any = {};
    if (dateParam) {
      routeFilter.date = dateParam;
    } else if (dateFromParam || dateToParam) {
      // SQLite에서 String 비교로도 YYYY-MM-DD는 사전순 = 시간순
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dateRange: any = {};
      if (dateFromParam) dateRange.gte = dateFromParam;
      if (dateToParam) dateRange.lte = dateToParam;
      routeFilter.date = dateRange;
    } else {
      // 기본: 오늘
      routeFilter.date = new Date().toISOString().split('T')[0];
    }
    where.route = routeFilter;

    // 키워드 검색 (주문번호/이름/전화번호/추적번호/주소)
    if (keyword) {
      where.OR = [
        { orderNumber: { contains: keyword } },
        { recipientName: { contains: keyword } },
        { recipientPhone: { contains: keyword } },
        { trackingNumber: { contains: keyword } },
        { address: { contains: keyword } },
        { addressDetail: { contains: keyword } },
      ];
    }

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        driver: {
          select: { id: true, name: true, phone: true, vehicleType: true, vehicleNumber: true },
        },
        route: {
          select: { id: true, date: true, driverId: true },
        },
      },
      orderBy: [{ route: { date: 'desc' } }, { sortOrder: 'asc' }],
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: deliveries,
      meta: {
        count: deliveries.length,
        limit,
        filters: {
          status: statusParam,
          driver: driverParam,
          date: dateParam,
          dateFrom: dateFromParam,
          dateTo: dateToParam,
          keyword: keyword || null,
        },
      },
    });
  } catch (error) {
    console.error('Admin deliveries API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deliveries' },
      { status: 500 }
    );
  }
}
