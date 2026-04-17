import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Find all routes for today, include deliveries and driver
    const routes = await prisma.route.findMany({
      where: { date: today },
      include: {
        deliveries: {
          orderBy: { updatedAt: 'desc' },
        },
        driver: true,
      },
    });

    // Aggregate delivery counts across all routes
    const allDeliveries = routes.flatMap((r) => r.deliveries);
    const totalDeliveries = allDeliveries.length;
    const completed = allDeliveries.filter((d) => d.status === 'completed').length;
    const inProgress = allDeliveries.filter((d) => d.status === 'in_progress').length;
    const pending = allDeliveries.filter((d) => d.status === 'pending').length;
    const failed = allDeliveries.filter((d) => d.status === 'failed').length;
    const completionRate = totalDeliveries > 0 ? Math.round((completed / totalDeliveries) * 100) : 0;

    // Build driver summaries — include drivers with AND without route today
    const routedDriverIds = new Set(routes.map((r) => r.driverId));
    const allDrivers = await prisma.driver.findMany();

    const drivers = allDrivers.map((driver) => {
      const route = routes.find((r) => r.driverId === driver.id);
      const driverDeliveries = route?.deliveries || [];
      return {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        vehicleType: driver.vehicleType,
        vehicleNumber: driver.vehicleNumber,
        isOnline: driver.isOnline,
        currentLat: driver.currentLat,
        currentLng: driver.currentLng,
        homeAddress: driver.homeAddress,
        homeLat: driver.homeLat,
        homeLng: driver.homeLng,
        todayCompleted: driverDeliveries.filter((d) => d.status === 'completed').length,
        todayFailed: driverDeliveries.filter((d) => d.status === 'failed').length,
        todayTotal: driverDeliveries.length,
        hasRouteToday: routedDriverIds.has(driver.id),
      };
    });

    // Build route summaries
    const routeSummaries = routes.map((route) => ({
      id: route.id,
      driverId: route.driverId,
      driverName: route.driver.name,
      date: route.date,
      totalDistance: route.totalDistance,
      estimatedDuration: route.estimatedDuration,
      optimized: route.optimized,
      deliveryCount: route.deliveries.length,
      completedCount: route.deliveries.filter((d) => d.status === 'completed').length,
    }));

    // Today's deliveries: all from today's routes (no limit — admin view)
    const recentDeliveries = allDeliveries
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((d) => {
        const route = routes.find((r) => r.id === d.routeId);
        return {
          id: d.id,
          trackingNumber: d.trackingNumber,
          orderNumber: d.orderNumber,
          status: d.status,
          address: d.address,
          addressDetail: d.addressDetail,
          recipientName: d.recipientName,
          recipientPhone: d.recipientPhone,
          specialInstructions: d.specialInstructions,
          sortOrder: d.sortOrder,
          completedAt: d.completedAt,
          proofType: d.proofType,
          proofData: d.proofData,
          failureReason: d.failureReason,
          updatedAt: d.updatedAt,
          driverName: route?.driver.name ?? null,
          driverId: route?.driverId ?? null,
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        today,
        totalDeliveries,
        completed,
        inProgress,
        pending,
        failed,
        completionRate,
        drivers,
        routes: routeSummaries,
        recentDeliveries,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
