/**
 * 거점 (기점) 관리
 *
 * 전 기사 공통 출발지. 환경변수로 오버라이드 가능.
 * 추후 여러 거점 지원이 필요하면 SystemConfig 테이블로 이동.
 */

export interface Depot {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export const DEPOT: Depot = {
  name: process.env.DEPOT_NAME || '본사 거점',
  address: process.env.DEPOT_ADDRESS || '서울특별시 서초구 반포대로20길 28',
  lat: parseFloat(process.env.DEPOT_LAT || '37.4922'),
  lng: parseFloat(process.env.DEPOT_LNG || '127.0082'),
};

export function getDepot(): Depot {
  return DEPOT;
}
