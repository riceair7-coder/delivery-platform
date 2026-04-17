import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateDriver } from '@/lib/auth';

/**
 * POST /api/routes/optimize-save
 * 최적화된 순서를 DB에 저장
 *
 * Body: {
 *   routeId: string,
 *   totalDistance: number,
 *   estimatedDuration: number,
 *   deliveries: [{ id, sortOrder, distanceFromPrev, durationFromPrev, estimatedArrival? }, ...]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const driver = await authenticateDriver(request);
    if (!driver) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { routeId, totalDistance, estimatedDuration, deliveries } = body;

    if (!routeId || !Array.isArray(deliveries)) {
      return NextResponse.json({ error: 'routeId and deliveries required' }, { status: 400 });
    }

    // route 소유권 확인
    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route || route.driverId !== driver.id) {
      return NextResponse.json({ error: 'Route not found or forbidden' }, { status: 403 });
    }

    // 트랜잭션으로 일괄 업데이트
    await prisma.$transaction(async (tx) => {
      // 1. 경로 메타데이터 업데이트
      await tx.route.update({
        where: { id: routeId },
        data: {
          totalDistance: totalDistance || 0,
          estimatedDuration: estimatedDuration || 0,
          optimized: true,
        },
      });

      // 2. 각 배송의 sortOrder + 거리/시간 업데이트
      for (const d of deliveries) {
        if (!d.id) continue;
        await tx.delivery.update({
          where: { id: d.id },
          data: {
            sortOrder: d.sortOrder ?? d.order,
            distanceFromPrev: d.distanceFromPrev ?? 0,
            durationFromPrev: d.durationFromPrev ?? 0,
            estimatedArrival: d.estimatedArrival ? new Date(d.estimatedArrival) : null,
          },
        });
      }
    }, { timeout: 30000 });

    return NextResponse.json({
      success: true,
      data: {
        routeId,
        updatedDeliveries: deliveries.length,
        totalDistance,
        estimatedDuration,
      },
    });
  } catch (e: any) {
    console.error('[optimize-save] error:', e);
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}
