/**
 * 카카오 내비 API (Directions) - 실제 도로 경로 조회
 *
 * https://apis-navi.kakaomobility.com/v1/directions
 * Header: Authorization: KakaoAK {REST_API_KEY}
 */

const KAKAO_REST_KEY = process.env.KAKAO_REST_API_KEY || '';
const DIRECTIONS_URL = 'https://apis-navi.kakaomobility.com/v1/directions';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RoutePath {
  coords: LatLng[];        // 실제 도로 좌표 배열
  distance: number;        // 미터
  duration: number;        // 초
  fromFallback: boolean;   // API 실패 시 직선으로 폴백
}

/**
 * 2점 사이 실제 도로 경로 조회
 */
export async function fetchDirections(origin: LatLng, destination: LatLng): Promise<RoutePath> {
  if (!KAKAO_REST_KEY) {
    return { coords: [origin, destination], distance: 0, duration: 0, fromFallback: true };
  }

  try {
    const params = new URLSearchParams({
      origin: `${origin.lng},${origin.lat}`,
      destination: `${destination.lng},${destination.lat}`,
      priority: 'RECOMMEND',
      car_fuel: 'GASOLINE',
      car_hipass: 'false',
      alternatives: 'false',
      road_details: 'false',
    });

    const res = await fetch(`${DIRECTIONS_URL}?${params}`, {
      headers: { 'Authorization': `KakaoAK ${KAKAO_REST_KEY}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return { coords: [origin, destination], distance: 0, duration: 0, fromFallback: true };
    }

    const data = await res.json();
    const route = data.routes?.[0];
    if (!route || route.result_code !== 0) {
      return { coords: [origin, destination], distance: 0, duration: 0, fromFallback: true };
    }

    // 모든 section의 roads vertexes를 flatten
    const coords: LatLng[] = [];
    for (const section of route.sections || []) {
      for (const road of section.roads || []) {
        const verts = road.vertexes || [];
        // vertexes는 [lng, lat, lng, lat, ...] 형태
        for (let i = 0; i < verts.length; i += 2) {
          coords.push({ lat: verts[i + 1], lng: verts[i] });
        }
      }
    }

    if (coords.length === 0) {
      return { coords: [origin, destination], distance: 0, duration: 0, fromFallback: true };
    }

    return {
      coords,
      distance: route.summary?.distance || 0,
      duration: route.summary?.duration || 0,
      fromFallback: false,
    };
  } catch (e) {
    return { coords: [origin, destination], distance: 0, duration: 0, fromFallback: true };
  }
}

/**
 * 여러 구간의 경로를 병렬로 조회 (거점 → 배송1 → 배송2 → ... → 종점)
 * 결과: 구간별 RoutePath 배열
 */
export async function fetchMultiLegPaths(points: LatLng[]): Promise<RoutePath[]> {
  if (points.length < 2) return [];

  // 구간 배열 (n-1개 구간)
  const legs: Array<{ from: LatLng; to: LatLng }> = [];
  for (let i = 0; i < points.length - 1; i++) {
    legs.push({ from: points[i], to: points[i + 1] });
  }

  // 병렬 조회 (하지만 rate limit 고려하여 5개씩 배치)
  const BATCH = 5;
  const results: RoutePath[] = [];
  for (let i = 0; i < legs.length; i += BATCH) {
    const batch = legs.slice(i, i + BATCH);
    const batchResults = await Promise.all(
      batch.map(leg => fetchDirections(leg.from, leg.to))
    );
    results.push(...batchResults);
  }
  return results;
}

export function isDirectionsAvailable(): boolean {
  return !!KAKAO_REST_KEY;
}
