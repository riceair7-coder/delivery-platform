import { NextResponse } from 'next/server';
import { getDepot } from '@/lib/depot';

/**
 * GET /api/system/depot
 * 거점(공통 출발지) 정보 조회 (인증 불필요)
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: getDepot(),
  });
}
