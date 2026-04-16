// API client with token management

const TOKEN_KEY = 'driver_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const json = await res.json();

  if (!res.ok || !json.success) {
    if (res.status === 401) {
      clearToken();
    }
    throw new Error(json.error || `API error ${res.status}`);
  }

  return json;
}

// ========== Auth ==========
export async function login(phone: string) {
  const res = await apiFetch<{ token: string; driver: any }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
  if (res.data?.token) {
    setToken(res.data.token);
  }
  return res.data!;
}

// ========== Driver ==========
export async function getMe() {
  const res = await apiFetch<any>('/api/drivers/me');
  return res.data!;
}

export async function updateLocation(lat: number, lng: number) {
  await apiFetch('/api/drivers/me/location', {
    method: 'PUT',
    body: JSON.stringify({ lat, lng }),
  });
}

// ========== Route ==========
export async function getTodayRoute() {
  const res = await apiFetch<any>('/api/routes/today');
  return res.data!;
}

// ========== Deliveries ==========
export async function getDeliveries(status?: string) {
  const params = status ? `?status=${status}` : '';
  const res = await apiFetch<any[]>(`/api/deliveries${params}`);
  return res.data!;
}

export async function getDelivery(id: string) {
  const res = await apiFetch<any>(`/api/deliveries/${id}`);
  return res.data!;
}

export async function updateDelivery(id: string, data: Record<string, any>) {
  const res = await apiFetch<any>(`/api/deliveries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data!;
}

export async function completeDelivery(id: string, body: {
  proofType: 'photo' | 'signature' | 'pin';
  proofData?: string;
  pinCode?: string;
  failureReason?: string;
}) {
  const res = await apiFetch<any>(`/api/deliveries/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data!;
}
