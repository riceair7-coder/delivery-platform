import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * GET /api/admin/drivers
 * 모든 기사 목록 조회
 */
export async function GET() {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        vehicleType: true,
        vehicleNumber: true,
        isOnline: true,
        homeAddress: true,
        homeLat: true,
        homeLng: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ success: true, data: drivers });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}

/**
 * POST /api/admin/drivers
 * 새 기사 등록
 * Body: { name, phone, vehicleType?, vehicleNumber? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, vehicleType = 'motorcycle', vehicleNumber = '' } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: '이름과 전화번호는 필수입니다' },
        { status: 400 }
      );
    }

    // 전화번호 중복 체크
    const existing = await prisma.driver.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json(
        { error: `이미 등록된 전화번호입니다: ${phone}` },
        { status: 409 }
      );
    }

    const driver = await prisma.driver.create({
      data: {
        name,
        phone,
        vehicleType,
        vehicleNumber,
        isOnline: false,
        token: crypto.randomBytes(32).toString('hex'),
      },
    });

    return NextResponse.json({ success: true, data: driver });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}
