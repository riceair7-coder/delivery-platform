/**
 * 카카오 주소 → 좌표 변환 (Geocoding)
 * 서버사이드에서 사용 (REST API)
 */

const KAKAO_REST_KEY = process.env.KAKAO_REST_API_KEY || '';

interface GeoResult {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  if (!KAKAO_REST_KEY) {
    console.warn('KAKAO_REST_API_KEY not set, using fallback geocoding');
    return fallbackGeocode(address);
  }

  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `KakaoAK ${KAKAO_REST_KEY}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return fallbackGeocode(address);

    const data = await res.json();
    if (data.documents?.length > 0) {
      const doc = data.documents[0];
      return {
        lat: parseFloat(doc.y),
        lng: parseFloat(doc.x),
      };
    }

    // 키워드 검색 폴백
    const kwUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(address)}`;
    const kwRes = await fetch(kwUrl, {
      headers: { 'Authorization': `KakaoAK ${KAKAO_REST_KEY}` },
      signal: AbortSignal.timeout(5000),
    });

    if (kwRes.ok) {
      const kwData = await kwRes.json();
      if (kwData.documents?.length > 0) {
        return {
          lat: parseFloat(kwData.documents[0].y),
          lng: parseFloat(kwData.documents[0].x),
        };
      }
    }

    return fallbackGeocode(address);
  } catch (e) {
    console.error('Geocoding error:', e);
    return fallbackGeocode(address);
  }
}

/**
 * 폴백: 서울 구 단위 대략적 좌표
 */
function fallbackGeocode(address: string): GeoResult | null {
  const districts: Record<string, [number, number]> = {
    '마포구': [37.5663, 126.9014],
    '서대문구': [37.5791, 126.9368],
    '은평구': [37.6027, 126.9291],
    '종로구': [37.5735, 126.9790],
    '중구': [37.5641, 126.9979],
    '용산구': [37.5326, 126.9906],
    '성동구': [37.5634, 127.0369],
    '광진구': [37.5385, 127.0823],
    '동대문구': [37.5744, 127.0397],
    '중랑구': [37.6066, 127.0927],
    '성북구': [37.5894, 127.0167],
    '강북구': [37.6397, 127.0254],
    '도봉구': [37.6688, 127.0472],
    '노원구': [37.6543, 127.0568],
    '서초구': [37.4837, 127.0324],
    '강남구': [37.5172, 127.0473],
    '송파구': [37.5146, 127.1059],
    '강동구': [37.5301, 127.1238],
    '영등포구': [37.5264, 126.8963],
    '동작구': [37.5124, 126.9393],
    '관악구': [37.4784, 126.9516],
    '금천구': [37.4519, 126.8955],
    '구로구': [37.4955, 126.8578],
    '양천구': [37.5170, 126.8666],
    '강서구': [37.5510, 126.8495],
  };

  for (const [gu, [lat, lng]] of Object.entries(districts)) {
    if (address.includes(gu)) {
      // 약간의 랜덤 오프셋 추가 (같은 구 내 배송지 구분)
      return {
        lat: lat + (Math.random() - 0.5) * 0.01,
        lng: lng + (Math.random() - 0.5) * 0.01,
      };
    }
  }

  // 서울 중심 기본값
  return { lat: 37.5665, lng: 126.9780 };
}
