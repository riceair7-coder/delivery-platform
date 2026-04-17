import { NextRequest, NextResponse } from 'next/server';
import { fetchMultiLegPaths, isDirectionsAvailable, LatLng } from '@/lib/kakaoDirections';

/**
 * POST /api/route-paths
 * 여러 점을 잇는 실제 도로 경로 조회
 *
 * Body: { points: [{lat, lng}, ...] }
 * Response: { legs: [{coords:[{lat,lng}, ...], distance, duration, fromFallback}, ...] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const points: LatLng[] = body.points || [];

    if (!Array.isArray(points) || points.length < 2) {
      return NextResponse.json({ error: 'points array (>=2) required' }, { status: 400 });
    }

    // 유효한 좌표만 필터링
    const valid = points.filter(
      p => typeof p?.lat === 'number' && typeof p?.lng === 'number' && p.lat !== 0 && p.lng !== 0
    );

    if (valid.length < 2) {
      return NextResponse.json({
        success: true,
        data: { legs: [], available: isDirectionsAvailable() },
      });
    }

    const legs = await fetchMultiLegPaths(valid);

    return NextResponse.json({
      success: true,
      data: {
        legs,
        available: isDirectionsAvailable(),
        totalLegs: legs.length,
        fallbackLegs: legs.filter(l => l.fromFallback).length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}
