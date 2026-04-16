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
  todayCompleted: number;
  todayFailed: number;
  todayTotal: number;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const filteredDeliveries =
    data?.recentDeliveries.filter(
      (d) => statusFilter === 'all' || d.status === statusFilter
    ) ?? [];

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
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
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
        <div className="p-4 max-w-2xl mx-auto">
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
        <div className="max-w-2xl mx-auto flex items-center justify-between">
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
        <div className="flex gap-1 max-w-2xl mx-auto">
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
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* ===== Overview Tab ===== */}
        {tab === 'overview' && data && (
          <>
            <div className="grid grid-cols-2 gap-3">
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
            {data.drivers.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>오늘 배정된 기사가 없습니다</p>
              </div>
            ) : (
              data.drivers.map((driver) => (
                <div key={driver.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold">{driver.name}</p>
                        <p className="text-sm text-gray-500">
                          {vehicleEmoji[driver.vehicleType] || '🚗'} {driver.vehicleNumber}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          driver.isOnline
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {driver.isOnline ? '운행중' : '오프라인'}
                      </span>
                    </div>
                  </div>
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
                  {driver.currentLat != null && driver.currentLng != null && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>
                        {driver.currentLat.toFixed(4)}, {driver.currentLng.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {/* ===== Deliveries Tab ===== */}
        {tab === 'deliveries' && data && (
          <>
            {/* Status filter buttons */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(
                [
                  ['all', '전체'],
                  ['pending', '대기'],
                  ['in_progress', '배송중'],
                  ['completed', '완료'],
                  ['failed', '실패'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    statusFilter === key
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {label}
                  {key === 'all'
                    ? ` (${data.recentDeliveries.length})`
                    : ` (${data.recentDeliveries.filter((d) => d.status === key).length})`}
                </button>
              ))}
            </div>

            {/* Delivery list */}
            {filteredDeliveries.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>해당 상태의 배송이 없습니다</p>
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
                          <span className="text-xs font-mono text-gray-400">
                            {d.trackingNumber}
                          </span>
                          <div className="flex items-center gap-2">
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
                        <p className="font-medium text-gray-900 truncate">{d.address}</p>
                        <div className="flex justify-between mt-1">
                          <p className="text-sm text-gray-500">{d.recipientName}</p>
                          {d.driverName && (
                            <p className="text-xs text-blue-500">{d.driverName}</p>
                          )}
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
function ErpSyncPanel() {
  const [erpDriverId, setErpDriverId] = useState('10');
  const [driverId, setDriverId] = useState('drv_001');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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
      const res = await fetch(`/api/erp/sync?erp_driver_id=${erpDriverId}&date=${date}`);
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
        body: JSON.stringify({ erpDriverId, driverId, date }),
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
            <label className="text-xs text-gray-500 mb-1 block">날짜</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
            />
          </div>
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
          <div className="text-sm text-gray-600 mb-3">
            기사 ID: {preview.erpDriverId} | 날짜: {preview.date} | 총 {preview.totalCount}건
          </div>
          {preview.deliveries.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>배송 데이터 없음</p>
              <p className="text-xs mt-1">개발팀에서 데이터를 아직 입력하지 않았을 수 있습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {preview.deliveries.map((d: any, i: number) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{d.recipient_name}</span>
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
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded-xl p-3">
              <p className="text-xl font-bold text-blue-600">{syncResult.totalFromErp || 0}</p>
              <p className="text-xs text-gray-500">ERP 데이터</p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-xl font-bold text-emerald-600">{syncResult.imported}</p>
              <p className="text-xs text-gray-500">가져옴</p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-xl font-bold text-gray-400">{syncResult.skipped}</p>
              <p className="text-xs text-gray-500">건너뜀</p>
            </div>
          </div>
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
          <li>동기화 시 중복 배송은 자동으로 건너뜁니다</li>
          <li>주소는 카카오 지오코딩으로 좌표 변환됩니다</li>
          <li>출발지: 서울특별시 서초구 반포대로20길 28 (고정)</li>
        </ul>
      </div>
    </div>
  );
}
