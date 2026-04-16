import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 기존 데이터 삭제
  await prisma.delivery.deleteMany();
  await prisma.route.deleteMany();
  await prisma.driver.deleteMany();

  // ========== 기사 생성 ==========
  const driver = await prisma.driver.create({
    data: {
      id: 'drv_001',
      name: '김배달',
      phone: '010-1234-5678',
      vehicleType: 'motorcycle',
      vehicleNumber: '서울 가 1234',
      isOnline: true,
      currentLat: 37.5665,
      currentLng: 126.9780,
      token: crypto.randomBytes(32).toString('hex'),
    },
  });
  console.log(`  Driver: ${driver.name} (token: ${driver.token?.slice(0, 8)}...)`);

  // ========== 경로 생성 ==========
  const today = new Date().toISOString().split('T')[0];
  const route = await prisma.route.create({
    data: {
      id: 'route_001',
      driverId: driver.id,
      date: today,
      totalDistance: 8500,
      estimatedDuration: 5400,
      optimized: true,
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });
  console.log(`  Route: ${route.id} (${route.date})`);

  // ========== 배송 생성 ==========
  const deliveries = [
    {
      trackingNumber: 'DL20260416001',
      address: '서울시 마포구 홍익로 15',
      addressDetail: '302호',
      lat: 37.5506,
      lng: 126.9239,
      recipientName: '이민지',
      recipientPhone: '010-2345-6789',
      specialInstructions: '부재 시 경비실 맡겨주세요',
      weight: 1.2,
      volume: 500,
      pinCode: '7823',
      status: 'completed',
      sortOrder: 1,
      distanceFromPrev: 0,
      durationFromPrev: 0,
      completedAt: new Date(Date.now() - 30 * 60 * 1000),
      proofType: 'pin',
    },
    {
      trackingNumber: 'DL20260416002',
      address: '서울시 마포구 와우산로 94',
      addressDetail: '1층',
      lat: 37.5532,
      lng: 126.9254,
      recipientName: '박준혁',
      recipientPhone: '010-3456-7890',
      weight: 3.5,
      volume: 2000,
      status: 'in_progress',
      sortOrder: 2,
      distanceFromPrev: 1200,
      durationFromPrev: 5,
    },
    {
      trackingNumber: 'DL20260416003',
      address: '서울시 서대문구 연세로 50',
      addressDetail: '상가 B동',
      lat: 37.5659,
      lng: 126.9397,
      recipientName: '최수진',
      recipientPhone: '010-4567-8901',
      specialInstructions: '문 앞에 놔두세요',
      weight: 0.8,
      volume: 300,
      status: 'pending',
      sortOrder: 3,
      distanceFromPrev: 800,
      durationFromPrev: 4,
    },
    {
      trackingNumber: 'DL20260416004',
      address: '서울시 은평구 진관3로 15-20',
      addressDetail: '204호',
      lat: 37.6208,
      lng: 126.9165,
      recipientName: '정대현',
      recipientPhone: '010-5678-9012',
      weight: 2.1,
      volume: 1200,
      status: 'pending',
      sortOrder: 4,
      distanceFromPrev: 3500,
      durationFromPrev: 15,
    },
    {
      trackingNumber: 'DL20260416005',
      address: '서울시 마포구 성미산로 153',
      addressDetail: '501호',
      lat: 37.5583,
      lng: 126.9171,
      recipientName: '한소연',
      recipientPhone: '010-6789-0123',
      weight: 0.5,
      volume: 200,
      pinCode: '4521',
      status: 'pending',
      sortOrder: 5,
      distanceFromPrev: 1100,
      durationFromPrev: 6,
    },
  ];

  for (const d of deliveries) {
    await prisma.delivery.create({
      data: {
        ...d,
        routeId: route.id,
        driverId: driver.id,
        estimatedArrival: new Date(Date.now() + d.sortOrder * 20 * 60 * 1000),
      },
    });
  }
  console.log(`  Deliveries: ${deliveries.length}건 생성`);

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
