import axios from 'axios';

// В продакшене задай VITE_API_URL при сборке (или в .env.production). Локально — относительный /api.
const raw = typeof import.meta.env.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL.trim() : '';
const base = raw ? raw.replace(/\/+$/, '') : '';
const API_BASE = base ? (base.endsWith('/api') ? base : `${base}/api`) : '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('auth/login')) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export type AdminUser = { id: number; email: string; name: string | null; role: string };

export async function login(email: string, password: string): Promise<{ accessToken: string; admin: AdminUser }> {
  const { data } = await api.post<{ accessToken: string; admin: AdminUser }>('/admin/auth/login', { email, password });
  return data;
}

export async function getMe(): Promise<AdminUser> {
  const { data } = await api.get<AdminUser>('/admin/me');
  return data;
}

export interface DashboardStats {
  usersOnline: number;
  subscriptionsActive: number;
  usersToday: number;
  newRegistrations: number;
  chartData: { date: string; count: number }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/admin/stats/dashboard');
  return data;
}

export interface UserListItem {
  id: number;
  email: string | null;
  name: string;
  phoneE164: string | null;
  createdAt: string;
  premiumUntil: string | null;
  trialUntil: string | null;
  blockedUntil: string | null;
  blockReason: string | null;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    productId: string | null;
  } | null;
}

export interface UserDetail extends UserListItem {
  deletionRequestedAt: string | null;
  scheduledDeleteAt: string | null;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    productId: string | null;
    store: string | null;
  } | null;
}

export async function getUsers(params: { search?: string; page?: number; limit?: number }) {
  const { data } = await api.get<{ items: UserListItem[]; total: number; page: number; limit: number }>('/admin/users', {
    params: { search: params.search || undefined, page: params.page ?? 1, limit: params.limit ?? 20 },
  });
  return data;
}

export async function getUser(id: number): Promise<UserDetail> {
  const { data } = await api.get<UserDetail>(`/admin/users/${id}`);
  return data;
}

export async function blockUser(id: number, body: { reason?: string; until?: string }) {
  const { data } = await api.post<{ success: boolean }>(`/admin/users/${id}/block`, body);
  return data;
}

export async function unblockUser(id: number) {
  const { data } = await api.post<{ success: boolean }>(`/admin/users/${id}/unblock`, {});
  return data;
}

export interface PromoCodeItem {
  id: string;
  code: string;
  name: string;
  discountRubles: number;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  paymentsCount: number;
}

export async function getPromoCodes(): Promise<PromoCodeItem[]> {
  const { data } = await api.get<PromoCodeItem[]>('/admin/promocodes');
  return data;
}

export async function createPromoCode(dto: { code: string; name: string; discountRubles: number; validUntil: string }) {
  const { data } = await api.post<PromoCodeItem>('/admin/promocodes', dto);
  return data;
}

export async function createPaymentLink(body: {
  planId: string;
  emailOrId: string;
  promoCodeId?: string;
  returnUrl?: string;
  cancelUrl?: string;
}) {
  const { data } = await api.post<{ confirmationUrl: string; paymentId: string }>('/admin/payments/create-link', body);
  return data;
}

export async function getPlans(): Promise<{ id: string; durationMonths: number; price: number; description: string }[]> {
  const { data } = await api.get('/payments/plans');
  return data;
}
