import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchErpDeliveries, ErpDelivery } from '@/lib/erpClient';
import { geocodeAddress } from '@/lib/geocoder';

/**
 * POST /api/erp/sync
 * ERP에서 배송 데이터를 가져와 DB에 동기화
 *
 * Body: {
 *   erpDriverId: string,
 *   driverId: string,
 *   date?: string,              // 기본: 오늘
 *   includeYesterday?: boolean  // 기본: true (전일 주문건도 오늘 배송)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { erpDriverId, driverId, date, includeYesterday = true } = body;

    if (!erpDriverId || !driverId) {
      return NextResponse.json(
        { error: 'erpDriverId and driverId are required' },
        { status: 400 }
      );
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    // 어제 날짜 계산
    const yesterday = new Date(targetDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // 1. 기사 존재 확인
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      return NextResponse.json(
        { error: `Driver ${driverId} not found` },
        { status: 404 }
      );
    }

    // 2. ERP에서 배송 데이터 조회 (오늘 + 전일)
    const datesToFetch = includeYesterday ? [yesterdayStr, targetDate] : [targetDate];
    const erpResults = await Promise.all(
      datesToFetch.map(async (d) => ({
        date: d,
        data: await fetchErpDeliveries(erpDriverId, d).catch(() => ({
          driver_id: erpDriverId,
          date: d,
          deliveries: [] as ErpDelivery[],
          total_count: 0,
        })),
      }))
    );

    // 전일 + 금일 배송 통합 (전일 주문 먼저, 금일 주문 나중에)
    const allDeliveries: Array<{ erp: ErpDelivery; erpDate: string }> = [];
    for (const { date: d, data } of erpResults) {
      for (const erp of data.deliveries) {
        allDeliveries.push({ erp, erpDate: d });
      }
    }

    const yesterdayCount = erpResults[0]?.data.total_count || 0;
    const todayCount = includeYesterday
      ? erpResults[1]?.data.total_count || 0
      : erpResults[0]?.data.total_count || 0;

    if (allDeliveries.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'ERP에 배송 데이터가 없습니다',
          erpDriverId,
          targetDate,
          datesFetched: datesToFetch,
          yesterdayCount,
          todayCount,
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

    // 현재 route의 최대 sortOrder 확인 (이어붙이기)
    const existingMax = await prisma.delivery.aggregate({
      where: { routeId: route.id },
      _max: { sortOrder: true },
    });
    let sortOrderBase = existingMax._max.sortOrder || 0;

    // 4. 배송 데이터 임포트
    let imported = 0;
    let skipped = 0;
    let importedYesterday = 0;
    let importedToday = 0;
    const errors: string[] = [];

    for (let i = 0; i < allDeliveries.length; i++) {
      const { erp, erpDate } = allDeliveries[i];

      // 필수 필드 검증
      if (!erp.id || !erp.address || !erp.recipient_name || !erp.recipient_phone) {
        errors.push(`배송 #${i + 1}: 필수 필드 누락 (id, address, recipient_name, recipient_phone)`);
        skipped++;
        continue;
      }

      // 트래킹 번호 생성: ERP 원본 날짜 기반 (중복 방지)
      const trackingNumber = `ERP-${erpDriverId}-${erpDate.replace(/-/g, '')}-${erp.id}`;

      // 중복 확인 (같은 ERP 주문이 이미 DB에 있는지 - 어느 route이든)
      const existing = await prisma.delivery.findUnique({
        where: { trackingNumber },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // 주소 → 좌표 변환
      const geo = await geocodeAddress(erp.address);

      // 전일 주문 표시를 메모에 추가
      const isYesterday = erpDate !== targetDate;
      const instructions = isYesterday
        ? `[전일주문] ${erp.note || ''}`.trim()
        : erp.note || '';

      // DB에 배송 생성
      sortOrderBase++;
      await prisma.delivery.create({
        data: {
          routeId: route.id,
          driverId,
          trackingNumber,
          orderNumber: erp.id, // ERP 주문번호 저장
          status: 'pending',
          address: erp.address,
          addressDetail: erp.address_detail || '',
          lat: geo?.lat || 0,
          lng: geo?.lng || 0,
          recipientName: erp.recipient_name,
          recipientPhone: erp.recipient_phone,
          specialInstructions: instructions,
          sortOrder: sortOrderBase,
        },
      });
      imported++;
      if (isYesterday) importedYesterday++;
      else importedToday++;
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
        targetDate,
        datesFetched: datesToFetch,
        totals: {
          yesterday: yesterdayCount,
          today: todayCount,
          all: yesterdayCount + todayCount,
        },
        imported,
        importedYesterday,
        importedToday,
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
 * GET /api/erp/sync?erp_driver_id=10&date=2026-04-17&include_yesterday=true
 * ERP 데이터 미리보기 (임포트하지 않고 조회만)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const erpDriverId = searchParams.get('erp_driver_id');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const includeYesterday = searchParams.get('include_yesterday') !== 'false'; // 기본 true

    if (!erpDriverId) {
      return NextResponse.json(
        { error: 'erp_driver_id is required' },
        { status: 400 }
      );
    }

    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const datesToFetch = includeYesterday ? [yesterdayStr, date] : [date];

    const results = await Promise.all(
      datesToFetch.map(async (d) => {
        try {
          const data = await fetchErpDeliveries(erpDriverId, d);
          return { date: d, deliveries: data.deliveries, totalCount: data.total_count };
        } catch {
          return { date: d, deliveries: [], totalCount: 0 };
        }
      })
    );

    // 통합 배송 목록 (전일 먼저, 금일 나중)
    const combined = results.flatMap(r =>
      r.deliveries.map(d => ({ ...d, _erpDate: r.date, _isYesterday: r.date !== date }))
    );

    const yesterdayResult = includeYesterday ? results[0] : null;
    const todayResult = includeYesterday ? results[1] : results[0];

    return NextResponse.json({
      success: true,
      data: {
        erpDriverId,
        targetDate: date,
        datesFetched: datesToFetch,
        totals: {
          yesterday: yesterdayResult?.totalCount || 0,
          today: todayResult?.totalCount || 0,
          all: combined.length,
        },
        deliveries: combined,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: `ERP 조회 실패: ${e.message}` },
      { status: 500 }
    );
  }
}
