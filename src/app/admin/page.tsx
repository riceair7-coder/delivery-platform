'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  CheckCircle,
  XCircle,
  Truck,
  TrendingUp,
  Users,
  MapPin,
  Phone,
  ChevronDown,
  ChevronUp,
  Route,
  Clock,
  AlertCircle,
  Home,
  Building2,
  Edit2,
  Save,
  X,
  Search,
  Calendar,
  Filter,
  RotateCcw,
} from 'lucide-react';

interface DashboardDriver {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string;
  isOnline: boolean;
  currentLat: number | null;
  currentLng: number | null;
  homeAddress: string | null;
  homeLat: number | null;
  homeLng: number | null;
  todayCompleted: number;
  todayFailed: number;
  todayTotal: number;
  hasRouteToday?: boolean;
}

interface DashboardRoute {
  id: string;
  driverId: string;
  driverName: string;
  date: string;
  totalDistance: number;
  estimatedDuration: number;
  optimized: boolean;
  deliveryCount: number;
  completedCount: number;
}

interface RecentDelivery {
  id: string;
  trackingNumber: string;
  orderNumber: string | null;
  status: string;
  address: string;
  addressDetail: string;
  recipientName: string;
  recipientPhone: string;
  specialInstructions: string;
  sortOrder: number;
  completedAt: string | null;
  proofType: string | null;
  proofData: string | null;
  failureReason: string | null;
  updatedAt: string;
  driverName: string | null;
  driverId: string | null;
}

interface DashboardData {
  today: string;
  totalDeliveries: number;
  completed: number;
  inProgress: number;
  pending: number;
  failed: number;
  completionRate: number;
  drivers: DashboardDriver[];
  routes: DashboardRoute[];
  recentDeliveries: RecentDelivery[];
}

type TabType = 'overview' | 'drivers' | 'deliveries' | 'erp';
type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'failed';

const statusLabel: Record<string, string> = {
  pending: '대기',
  in_progress: '배송중',
  completed: '완료',
  failed: '실패',
  cancelled: '취소',
};

const statusStyle: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const vehicleEmoji: Record<string, string> = {
  motorcycle: '🏍',
  bicycle: '🚲',
  car: '🚗',
  van: '🚐',
};

export default function AdminPage() {
  const [tab, setTab] = useState<TabType>('overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 검색 상태
  const todayStr = new Date().toISOString().split('T')[0];
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState(todayStr);
  const [searchDateTo, setSearchDateTo] = useState(todayStr);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMeta, setSearchMeta] = useState<any>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const res = await fetch('/api/admin/dashboard');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Unknown error');
      setData(json.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // 검색 실행 (원격 API)
  const runSearch = useCallback(async () => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchKeyword.trim()) params.set('keyword', searchKeyword.trim());
      if (searchDateFrom) params.set('dateFrom', searchDateFrom);
      if (searchDateTo) params.set('dateTo', searchDateTo);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (driverFilter !== 'all') params.set('driver', driverFilter);

      const res = await fetch(`/api/admin/deliveries?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSearchResults(json.data);
        setSearchMeta(json.meta);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchLoading(false);
    }
  }, [searchKeyword, searchDateFrom, searchDateTo, statusFilter, driverFilter]);

  const resetSearch = () => {
    setSearchKeyword('');
    setSearchDateFrom(todayStr);
    setSearchDateTo(todayStr);
    setStatusFilter('all');
    setDriverFilter('all');
    setSearchResults(null);
    setSearchMeta(null);
  };

  // 원격 검색 결과가 있으면 그걸 쓰고, 아니면 오늘 대시보드 데이터 기반 클라이언트 필터
  const filteredDeliveries = searchResults
    ? searchResults.map((d) => ({
        id: d.id,
        trackingNumber: d.trackingNumber,
        orderNumber: d.orderNumber ?? null,
        status: d.status,
        address: d.address,
        addressDetail: d.addressDetail || '',
        recipientName: d.recipientName,
        recipientPhone: d.recipientPhone,
        specialInstructions: d.specialInstructions || '',
        sortOrder: d.sortOrder,
        completedAt: d.completedAt,
        proofType: d.proofType,
        proofData: d.proofData,
        failureReason: d.failureReason,
        updatedAt: d.updatedAt,
        driverName: d.driver?.name ?? null,
        driverId: d.driver?.id ?? d.driverId ?? null,
        routeDate: d.route?.date ?? null,
      }))
    : (data?.recentDeliveries.filter(
        (d) =>
          (statusFilter === 'all' || d.status === statusFilter) &&
          (driverFilter === 'all' || d.driverId === driverFilter)
      ) ?? []).map((d) => ({ ...d, routeDate: data?.today ?? null }));

  const totalDistance = data?.routes.reduce((sum, r) => sum + r.totalDistance, 0) ?? 0;
  const totalDuration = data?.routes.reduce((sum, r) => sum + r.estimatedDuration, 0) ?? 0;

  const stats = data
    ? [
        { label: '총 배송', val: data.totalDeliveries, Icon: Package, bg: 'bg-blue-50', txt: 'text-blue-600', ib: 'bg-blue-500' },
        { label: '완료', val: data.completed, Icon: CheckCircle, bg: 'bg-emerald-50', txt: 'text-emerald-600', ib: 'bg-emerald-500' },
        { label: '진행중', val: data.inProgress, Icon: Truck, bg: 'bg-amber-50', txt: 'text-amber-600', ib: 'bg-amber-500' },
        { label: '실패', val: data.failed, Icon: XCircle, bg: 'bg-red-50', txt: 'text-red-600', ib: 'bg-red-500' },
      ]
    : [];

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gray-900 text-white px-6 pt-12 pb-6">
          <div className="h-8 w-48 bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-700 rounded animate-pulse mt-2" />
        </div>
        <div className="p-4 space-y-4 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 h-28 animate-pulse" />
            ))}
          </div>
          <div className="bg-white rounded-2xl p-5 h-32 animate-pulse" />
          <div className="bg-white rounded-2xl p-5 h-24 animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gray-900 text-white px-6 pt-12 pb-6">
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        </div>
        <div className="p-4 max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-700 font-medium">데이터를 불러올 수 없습니다</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <button
              onClick={() => { setLoading(true); fetchData(); }}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-sm"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 text-white px-6 pt-12 pb-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">관리자 대시보드</h1>
            <p className="text-gray-400 text-sm mt-1">
              {data
                ? new Date(data.today + 'T00:00:00').toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })
                : ''}
            </p>
          </div>
          {/* Auto-refresh indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {refreshing && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${refreshing ? 'bg-emerald-500' : 'bg-gray-500'}`} />
            </span>
            <span className="text-xs text-gray-500">자동 갱신</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="flex gap-1 max-w-5xl mx-auto">
          {([['overview', '개요'], ['drivers', '배송기사'], ['deliveries', '배송현황'], ['erp', 'ERP 연동']] as const).map(
            ([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === k ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'
                }`}
              >
                {l}
              </button>
            )
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-w-5xl mx-auto">
        {/* ===== Overview Tab ===== */}
        {tab === 'overview' && data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {stats.map(({ label, val, Icon, bg, txt, ib }) => (
                <div key={label} className={`${bg} rounded-2xl p-4`}>
                  <div
                    className={`w-10 h-10 ${ib} text-white rounded-xl flex items-center justify-center mb-3`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className={`text-2xl font-bold ${txt}`}>{val}</p>
                  <p className="text-gray-600 text-sm">{label}</p>
                </div>
              ))}
            </div>

            {/* Completion rate */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  배송 완료율
                </h3>
                <span className="text-2xl font-bold text-blue-600">{data.completionRate}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-700"
                  style={{ width: `${data.completionRate}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>목표: 95%</span>
                <span>현재: {data.completionRate}%</span>
              </div>
            </div>

            {/* Route optimization summary */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Route className="w-5 h-5 text-blue-500" />
                노선 최적화 요약
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold">{(totalDistance / 1000).toFixed(1)}km</p>
                  <p className="text-xs text-gray-500 mt-1">총 이동거리</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{Math.round(totalDuration / 60)}분</p>
                  <p className="text-xs text-gray-500 mt-1">예상 시간</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-blue-600">
                    {data.routes.filter((r) => r.optimized).length}/{data.routes.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">최적화 완료</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== Drivers Tab ===== */}
        {tab === 'drivers' && data && (
          <>
            <DepotInfoCard />
            <AddDriverCard onAdded={fetchData} />
            {data.drivers.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>등록된 기사가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.drivers.map((driver) => (
                  <DriverCard key={driver.id} driver={driver} onUpdated={fetchData} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== Deliveries Tab ===== */}
        {tab === 'deliveries' && data && (
          <>
            {/* 검색 패널 */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-500" />
                  배송 검색
                </h3>
                {searchResults && (
                  <button
                    onClick={resetSearch}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    초기화
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 키워드 */}
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">검색어</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={e => setSearchKeyword(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
                      placeholder="주문번호 / 이름 / 전화번호 / 주소 / 추적번호"
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                {/* 시작일 */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">시작일</label>
                  <input
                    type="date"
                    value={searchDateFrom}
                    onChange={e => setSearchDateFrom(e.target.value)}
                    max={searchDateTo}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                  />
                </div>
                {/* 종료일 */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">종료일</label>
                  <input
                    type="date"
                    value={searchDateTo}
                    onChange={e => setSearchDateTo(e.target.value)}
                    min={searchDateFrom}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {/* 빠른 기간 선택 */}
                <button
                  onClick={() => { setSearchDateFrom(todayStr); setSearchDateTo(todayStr); }}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"
                >
                  오늘
                </button>
                <button
                  onClick={() => {
                    const d = new Date(); d.setDate(d.getDate() - 7);
                    setSearchDateFrom(d.toISOString().split('T')[0]);
                    setSearchDateTo(todayStr);
                  }}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"
                >
                  최근 7일
                </button>
                <button
                  onClick={() => {
                    const d = new Date(); d.setDate(d.getDate() - 30);
                    setSearchDateFrom(d.toISOString().split('T')[0]);
                    setSearchDateTo(todayStr);
                  }}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"
                >
                  최근 30일
                </button>
                <div className="flex-1" />
                <button
                  onClick={runSearch}
                  disabled={searchLoading}
                  className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  {searchLoading ? '검색 중...' : '검색'}
                </button>
              </div>

              {searchMeta && (
                <p className="text-xs text-gray-500 border-t pt-2">
                  총 <span className="font-bold text-blue-600">{searchMeta.count}</span>건
                  {searchMeta.count === searchMeta.limit && ` (최대 ${searchMeta.limit}건까지 표시)`}
                  {searchMeta.filters.keyword && ` · 키워드 "${searchMeta.filters.keyword}"`}
                  {searchMeta.filters.dateFrom && ` · ${searchMeta.filters.dateFrom} ~ ${searchMeta.filters.dateTo || searchMeta.filters.dateFrom}`}
                </p>
              )}
            </div>

            {/* Status filter buttons */}
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">상태</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(
                    [
                      ['all', '전체'],
                      ['pending', '대기'],
                      ['in_progress', '배송중'],
                      ['completed', '완료'],
                      ['failed', '실패'],
                    ] as const
                  ).map(([key, label]) => {
                    // 검색 결과 있으면 그것 기준, 없으면 오늘 대시보드 기준
                    const baseList = searchResults || data.recentDeliveries;
                    const base = baseList.filter(
                      (d: any) => driverFilter === 'all' || (d.driverId ?? d.driver?.id) === driverFilter
                    );
                    const count = key === 'all' ? base.length : base.filter((d: any) => d.status === key).length;
                    return (
                      <button
                        key={key}
                        onClick={() => setStatusFilter(key)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                          statusFilter === key
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                      >
                        {label} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Driver filter */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">기사</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setDriverFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      driverFilter === 'all'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    전체 ({(searchResults || data.recentDeliveries).length})
                  </button>
                  {data.drivers.map((dr) => {
                    const baseList: any[] = searchResults || data.recentDeliveries;
                    const count = baseList.filter((d: any) =>
                      (d.driverId ?? d.driver?.id) === dr.id
                    ).length;
                    if (!searchResults && count === 0) return null; // 오늘 기준일 때만 0 숨김
                    return (
                        <button
                          key={dr.id}
                          onClick={() => setDriverFilter(dr.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                            driverFilter === dr.id
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white text-gray-600 border border-gray-200'
                          }`}
                        >
                          <span>{vehicleEmoji[dr.vehicleType] || '🚗'}</span>
                          {dr.name} ({count})
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Delivery list */}
            {filteredDeliveries.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>해당 조건의 배송이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDeliveries.map((d) => {
                  const isExpanded = expandedId === d.id;
                  return (
                    <div key={d.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <button
                        className="w-full p-4 text-left"
                        onClick={() => setExpandedId(isExpanded ? null : d.id)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {typeof d.sortOrder === 'number' && (
                              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                                {d.sortOrder}
                              </span>
                            )}
                            <div className="min-w-0 flex items-baseline gap-1.5">
                              {d.orderNumber ? (
                                <>
                                  <span className="text-sm font-bold text-gray-900">
                                    {d.orderNumber}
                                  </span>
                                  <span className="text-[10px] text-gray-300 font-mono truncate hidden sm:inline">
                                    {d.trackingNumber}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs font-mono text-gray-400 truncate">
                                  {d.trackingNumber}
                                </span>
                              )}
                              {searchResults && (d as any).routeDate && (
                                <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {(d as any).routeDate}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                statusStyle[d.status] || 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {statusLabel[d.status] || d.status}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* 수령인 이름 + 기사 */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <p className="font-semibold text-gray-900 truncate">
                              {d.recipientName}
                            </p>
                          </div>
                          {d.driverName && (
                            <span className="flex-shrink-0 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                              {d.driverName}
                            </span>
                          )}
                        </div>

                        {/* 주소 */}
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-700 truncate">{d.address}</p>
                            {d.addressDetail && (
                              <p className="text-xs text-gray-400 truncate">{d.addressDetail}</p>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
                          {d.addressDetail && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span>{d.addressDetail}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>{d.recipientPhone}</span>
                          </div>
                          {d.specialInstructions && (
                            <div className="flex items-start gap-2 text-sm text-gray-600">
                              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                              <span>{d.specialInstructions}</span>
                            </div>
                          )}
                          {d.completedAt && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span>
                                완료:{' '}
                                {new Date(d.completedAt).toLocaleString('ko-KR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          )}
                          {d.proofType && (
                            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                              인수 확인: {d.proofType === 'photo' ? '사진' : d.proofType === 'signature' ? '서명' : 'PIN'}
                              {d.proofType === 'pin' && d.proofData && ` (${d.proofData})`}
                            </div>
                          )}
                          {d.failureReason && (
                            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                              실패 사유: {d.failureReason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ERP Sync Tab */}
        {tab === 'erp' && <ErpSyncPanel />}
      </div>
    </div>
  );
}

/* ========== ERP Sync Panel ========== */
/* ========== Depot Info Card ========== */
function DepotInfoCard() {
  const [depot, setDepot] = useState<{ name: string; address: string; lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetch('/api/system/depot')
      .then(r => r.json())
      .then(j => { if (j.success) setDepot(j.data); })
      .catch(() => {});
  }, []);

  if (!depot) return null;

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-amber-700">거점 (전 기사 공통 출발지)</p>
          <p className="font-bold text-gray-900 mt-0.5">{depot.name}</p>
          <p className="text-sm text-gray-600 mt-1">{depot.address}</p>
          <p className="text-xs text-gray-400 mt-1">
            ({depot.lat.toFixed(4)}, {depot.lng.toFixed(4)})
          </p>
        </div>
      </div>
    </div>
  );
}

/* ========== Driver Card (종점 편집 포함) ========== */
/* ========== Add Driver Card ========== */
function AddDriverCard({ onAdded }: { onAdded: () => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, vehicleType, vehicleNumber }),
      });
      const json = await res.json();
      if (json.success) {
        setName(''); setPhone(''); setVehicleNumber(''); setVehicleType('motorcycle');
        setAdding(false);
        onAdded();
      } else {
        setError(json.error || '등록 실패');
      }
    } catch (e: any) {
      setError(e.message || '네트워크 오류');
    } finally {
      setSaving(false);
    }
  };

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="w-full bg-white border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded-2xl p-4 flex items-center justify-center gap-2 text-gray-500 hover:text-blue-600 transition-colors"
      >
        <Users className="w-5 h-5" />
        <span className="font-medium">+ 새 기사 추가</span>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3 border-2 border-blue-200">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" />
          새 기사 등록
        </h3>
        <button onClick={() => setAdding(false)} className="text-gray-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">이름 *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="김배달"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">전화번호 *</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="010-1234-5678"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">차량 종류</label>
          <select
            value={vehicleType}
            onChange={e => setVehicleType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none bg-white"
          >
            <option value="motorcycle">🏍 오토바이</option>
            <option value="bicycle">🚲 자전거</option>
            <option value="car">🚗 승용차</option>
            <option value="van">🚐 승합차</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">차량 번호</label>
          <input
            type="text"
            value={vehicleNumber}
            onChange={e => setVehicleNumber(e.target.value)}
            placeholder="서울 가 1234"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={saving || !name.trim() || !phone.trim()}
          className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? '등록 중...' : '기사 등록'}
        </button>
        <button
          onClick={() => setAdding(false)}
          className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium"
        >
          취소
        </button>
      </div>

      <p className="text-xs text-gray-400">
        등록 후 기사 카드에서 종점을 설정할 수 있습니다
      </p>
    </div>
  );
}

function DriverCard({ driver, onUpdated }: { driver: DashboardDriver; onUpdated: () => void }) {
  const [editingHome, setEditingHome] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [address, setAddress] = useState(driver.homeAddress || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 기본 정보 수정 상태
  const [name, setName] = useState(driver.name);
  const [phone, setPhone] = useState(driver.phone);
  const [vehicleType, setVehicleType] = useState(driver.vehicleType);
  const [vehicleNumber, setVehicleNumber] = useState(driver.vehicleNumber);

  const saveHome = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/drivers/${driver.id}/home`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingHome(false);
        onUpdated();
      } else {
        setError(json.error || '저장 실패');
      }
    } catch (e: any) {
      setError(e.message || '네트워크 오류');
    } finally {
      setSaving(false);
    }
  };

  const cancelHome = () => {
    setEditingHome(false);
    setAddress(driver.homeAddress || '');
    setError('');
  };

  const saveInfo = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/drivers/${driver.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, vehicleType, vehicleNumber }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingInfo(false);
        onUpdated();
      } else {
        setError(json.error || '저장 실패');
      }
    } catch (e: any) {
      setError(e.message || '네트워크 오류');
    } finally {
      setSaving(false);
    }
  };

  const cancelInfo = () => {
    setEditingInfo(false);
    setName(driver.name);
    setPhone(driver.phone);
    setVehicleType(driver.vehicleType);
    setVehicleNumber(driver.vehicleNumber);
    setError('');
  };

  const remove = async () => {
    const hasData = driver.todayTotal > 0 || driver.hasRouteToday;
    const msg = hasData
      ? `${driver.name} 기사를 삭제하시겠습니까?\n\n⚠️ 오늘 ${driver.todayTotal}건의 배송/경로가 함께 삭제됩니다.`
      : `${driver.name} 기사를 삭제하시겠습니까?`;
    if (!confirm(msg)) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/drivers/${driver.id}?force=true`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        onUpdated();
      } else {
        setError(json.error || '삭제 실패');
      }
    } catch (e: any) {
      setError(e.message || '네트워크 오류');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        {!editingInfo ? (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold">{driver.name}</p>
              <p className="text-sm text-gray-500">
                {vehicleEmoji[driver.vehicleType] || '🚗'} {driver.vehicleNumber || '(번호 없음)'} · {driver.phone}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  driver.isOnline
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {driver.isOnline ? '운행중' : '오프라인'}
              </span>
              <button
                onClick={() => setEditingInfo(true)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="기사 정보 수정"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={remove}
                disabled={saving}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="기사 삭제"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Edit2 className="w-4 h-4 text-blue-500" />
              <p className="text-sm font-medium text-gray-700">기사 정보 수정</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">전화번호</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">차량 종류</label>
                <select
                  value={vehicleType}
                  onChange={e => setVehicleType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none bg-white"
                >
                  <option value="motorcycle">🏍 오토바이</option>
                  <option value="bicycle">🚲 자전거</option>
                  <option value="car">🚗 승용차</option>
                  <option value="van">🚐 승합차</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">차량 번호</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={e => setVehicleNumber(e.target.value)}
                  placeholder="서울 가 1234"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={saveInfo}
                disabled={saving || !name.trim() || !phone.trim()}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={cancelInfo}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{driver.todayCompleted}</p>
          <p className="text-xs text-gray-500 mt-1">완료</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{driver.todayFailed}</p>
          <p className="text-xs text-gray-500 mt-1">실패</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-bold">{driver.todayTotal}</p>
          <p className="text-xs text-gray-500 mt-1">전체</p>
        </div>
      </div>

      {/* 현재 위치 */}
      {driver.currentLat != null && driver.currentLng != null && (
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
          <MapPin className="w-3.5 h-3.5" />
          <span>현재: {driver.currentLat.toFixed(4)}, {driver.currentLng.toFixed(4)}</span>
        </div>
      )}

      {/* 종점 편집 영역 */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gradient-to-r from-blue-50/50 to-transparent">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Home className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-700">종점 (퇴근지)</span>
          </div>
          {!editingHome && (
            <button
              onClick={() => setEditingHome(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              {driver.homeAddress ? '수정' : '등록'}
            </button>
          )}
        </div>

        {!editingHome ? (
          driver.homeAddress ? (
            <div>
              <p className="text-sm text-gray-900">{driver.homeAddress}</p>
              {driver.homeLat != null && driver.homeLng != null && (
                <p className="text-xs text-gray-400 mt-0.5">
                  ({driver.homeLat.toFixed(4)}, {driver.homeLng.toFixed(4)})
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">종점이 등록되지 않았습니다</p>
          )
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="예: 서울시 강동구 천호대로 1000"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={saveHome}
                disabled={saving || !address.trim()}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={cancelHome}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium"
              >
                <X className="w-3.5 h-3.5" />
                취소
              </button>
            </div>
            <p className="text-xs text-gray-400">
              좌표는 주소에서 자동 변환됩니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ErpSyncPanel() {
  const [erpDriverId, setErpDriverId] = useState('10');
  const [driverId, setDriverId] = useState('drv_001');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [includeYesterday, setIncludeYesterday] = useState(true);
  const [preview, setPreview] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePreview = async () => {
    setLoading(true);
    setError('');
    setPreview(null);
    setSyncResult(null);
    try {
      const res = await fetch(
        `/api/erp/sync?erp_driver_id=${erpDriverId}&date=${date}&include_yesterday=${includeYesterday}`
      );
      const json = await res.json();
      if (json.success) {
        setPreview(json.data);
      } else {
        setError(json.error || 'ERP 조회 실패');
      }
    } catch (e: any) {
      setError(e.message || '네트워크 오류');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    setError('');
    setSyncResult(null);
    try {
      const res = await fetch('/api/erp/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ erpDriverId, driverId, date, includeYesterday }),
      });
      const json = await res.json();
      if (json.success) {
        setSyncResult(json.data);
      } else {
        setError(json.error || '동기화 실패');
      }
    } catch (e: any) {
      setError(e.message || '네트워크 오류');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Config */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-500" />
          ERP 배송 데이터 동기화
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ERP 기사 ID</label>
              <input
                type="text"
                value={erpDriverId}
                onChange={e => setErpDriverId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                placeholder="10"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">우리 기사 ID</label>
              <input
                type="text"
                value={driverId}
                onChange={e => setDriverId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                placeholder="drv_001"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">배송 날짜</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
            />
          </div>
          <label className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={includeYesterday}
              onChange={e => setIncludeYesterday(e.target.checked)}
              className="w-4 h-4 text-blue-500 rounded"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700">전일 주문건 포함</span>
              <p className="text-xs text-amber-700">
                어제 주문된 건 중 미배송건도 오늘 배송 대상으로 가져옵니다
              </p>
            </div>
          </label>
          <div className="flex gap-2">
            <button
              onClick={handlePreview}
              disabled={loading || !erpDriverId}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm disabled:opacity-50"
            >
              {loading ? '조회 중...' : 'ERP 미리보기'}
            </button>
            <button
              onClick={handleSync}
              disabled={loading || !erpDriverId || !driverId}
              className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl font-medium text-sm disabled:opacity-50"
            >
              {loading ? '동기화 중...' : '동기화 실행'}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h4 className="font-semibold mb-3">ERP 조회 결과</h4>
          <div className="text-sm text-gray-600 mb-3 space-y-1">
            <div>기사 ID: {preview.erpDriverId} | 대상 날짜: {preview.targetDate}</div>
            <div className="flex gap-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                전일 {preview.totals?.yesterday || 0}건
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                금일 {preview.totals?.today || 0}건
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                총 {preview.totals?.all || 0}건
              </span>
            </div>
          </div>
          {preview.deliveries.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>배송 데이터 없음</p>
              <p className="text-xs mt-1">개발팀에서 데이터를 아직 입력하지 않았을 수 있습니다</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {preview.deliveries.map((d: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg text-sm ${d._isYesterday ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium flex items-center gap-1.5">
                      {d._isYesterday && (
                        <span className="px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded text-[10px] font-bold">전일</span>
                      )}
                      {d.recipient_name}
                    </span>
                    <span className="text-xs text-gray-400">ID: {d.id}</span>
                  </div>
                  <p className="text-gray-600">{d.address} {d.address_detail}</p>
                  <p className="text-gray-400 text-xs mt-1">{d.recipient_phone}</p>
                  {d.note && <p className="text-amber-600 text-xs mt-1">📌 {d.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className={`rounded-2xl shadow-sm p-5 ${syncResult.imported > 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'}`}>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className={`w-5 h-5 ${syncResult.imported > 0 ? 'text-emerald-500' : 'text-gray-400'}`} />
            동기화 결과
          </h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-white rounded-xl p-3">
              <p className="text-xl font-bold text-blue-600">{syncResult.totals?.all || 0}</p>
              <p className="text-xs text-gray-500">ERP 전체</p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-xl font-bold text-emerald-600">{syncResult.imported}</p>
              <p className="text-xs text-gray-500">가져옴</p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-xl font-bold text-gray-400">{syncResult.skipped}</p>
              <p className="text-xs text-gray-500">건너뜀</p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-sm font-bold text-amber-600">
                전일 {syncResult.importedYesterday || 0}
              </p>
              <p className="text-sm font-bold text-blue-600">
                금일 {syncResult.importedToday || 0}
              </p>
            </div>
          </div>
          {syncResult.datesFetched && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              조회 날짜: {syncResult.datesFetched.join(', ')} → {syncResult.targetDate} 경로로 임포트
            </p>
          )}
          {syncResult.message && (
            <p className="text-sm text-gray-600 mt-3 text-center">{syncResult.message}</p>
          )}
          {syncResult.errors?.length > 0 && (
            <div className="mt-3 space-y-1">
              {syncResult.errors.map((err: string, i: number) => (
                <p key={i} className="text-xs text-red-500">{err}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">ERP 연동 안내</p>
        <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
          <li>ERP API: slogis.kr/api/deliveries.php</li>
          <li>파라미터: driver_id, date (YYYY-MM-DD)</li>
          <li>전일 주문건 포함 시: 선택 날짜 + 하루 전 데이터 모두 조회</li>
          <li>동기화 시 중복 배송은 자동으로 건너뜁니다 (같은 ERP ID + 원본 날짜)</li>
          <li>전일 주문건은 배송 메모에 [전일주문] 표시가 추가됩니다</li>
          <li>주소는 카카오 지오코딩으로 좌표 변환됩니다</li>
          <li>출발지: 서울특별시 서초구 반포대로20길 28 (고정)</li>
        </ul>
      </div>
    </div>
  );
}
