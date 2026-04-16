import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchErpDeliveries, ErpDelivery } from '@/lib/erpClient';
import { geocodeAddress } from '@/lib/geocoder';

/**
 * POST /api/erp/sync
 * ERP에서 배송 데이터를 가져와 DB에 동기화
 *
 * Body: { erpDriverId: string, driverId: string, date?: string }
 * - erpDriverId: ERP 시스템의 기사 ID (예: "10")
 * - driverId: 우리 시스템의 기사 ID (예: "drv_001")
 * - date: 날짜 (기본: 오늘)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { erpDriverId, driverId, date } = body;

    if (!erpDriverId || !driverId) {
      return NextResponse.json(
        { error: 'erpDriverId and driverId are required' },
        { status: 400 }
      );
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    // 1. 기사 존재 확인
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      return NextResponse.json(
        { error: `Driver ${driverId} not found` },
        { status: 404 }
      );
    }

    // 2. ERP에서 배송 데이터 조회
    const erpData = await fetchErpDeliveries(erpDriverId, targetDate);

    if (!erpData.deliveries || erpData.deliveries.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'ERP에 배송 데이터가 없습니다',
          erpDriverId,
          date: targetDate,
          imported: 0,
          skipped: 0,
        },
      });
    }

    // 3. 기존 경로 확인 (있으면 업데이트, 없으면 생성)
    let route = await prisma.route.findUnique({
      where: { driverId_date: { driverId, date: targetDate } },
    });

    if (!route) {
      route = await prisma.route.create({
        data: {
          driverId,
          date: targetDate,
          totalDistance: 0,
          estimatedDuration: 0,
          optimized: false,
        },
      });
    }

    // 4. 배송 데이터 임포트
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < erpData.deliveries.length; i++) {
      const erp: ErpDelivery = erpData.deliveries[i];

      // 필수 필드 검증
      if (!erp.id || !erp.address || !erp.recipient_name || !erp.recipient_phone) {
        errors.push(`배송 #${i + 1}: 필수 필드 누락 (id, address, recipient_name, recipient_phone)`);
        skipped++;
        continue;
      }

      // 트래킹 번호 생성: ERP ID 기반
      const trackingNumber = `ERP-${erpDriverId}-${targetDate.replace(/-/g, '')}-${erp.id}`;

      // 중복 확인
      const existing = await prisma.delivery.findUnique({
        where: { trackingNumber },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // 주소 → 좌표 변환
      const geo = await geocodeAddress(erp.address);

      // DB에 배송 생성
      await prisma.delivery.create({
        data: {
          routeId: route.id,
          driverId,
          trackingNumber,
          status: 'pending',
          address: erp.address,
          addressDetail: erp.address_detail || '',
          lat: geo?.lat || 0,
          lng: geo?.lng || 0,
          recipientName: erp.recipient_name,
          recipientPhone: erp.recipient_phone,
          specialInstructions: erp.note || '',
          sortOrder: i + 1,
        },
      });
      imported++;
    }

    // 5. 경로 시작 시간 업데이트
    if (imported > 0 && !route.startTime) {
      await prisma.route.update({
        where: { id: route.id },
        data: { startTime: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `ERP 동기화 완료`,
        erpDriverId,
        driverId,
        date: targetDate,
        totalFromErp: erpData.total_count,
        imported,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
        routeId: route.id,
      },
    });
  } catch (e: any) {
    console.error('ERP sync error:', e);
    return NextResponse.json(
      { error: `ERP 동기화 실패: ${e.message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/erp/sync?erp_driver_id=10&date=2026-04-16
 * ERP 데이터 미리보기 (임포트하지 않고 조회만)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const erpDriverId = searchParams.get('erp_driver_id');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!erpDriverId) {
      return NextResponse.json(
        { error: 'erp_driver_id is required' },
        { status: 400 }
      );
    }

    const erpData = await fetchErpDeliveries(erpDriverId, date);

    return NextResponse.json({
      success: true,
      data: {
        erpDriverId,
        date,
        totalCount: erpData.total_count,
        deliveries: erpData.deliveries,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: `ERP 조회 실패: ${e.message}` },
      { status: 500 }
    );
  }
}
