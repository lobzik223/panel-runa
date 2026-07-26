/** Клиент админ-API backend-runa: `/api/admin/*` */

const ADMIN_JWT_STORAGE_KEY = 'runa_admin_jwt';
const ADMIN_NAME_STORAGE_KEY = 'runa_admin_name';
const ADMIN_ROLE_STORAGE_KEY = 'runa_admin_role';
const ADMIN_EMAIL_STORAGE_KEY = 'runa_admin_email';

export type DashboardStats = {
  usersOnline: number;
  subscriptionsActive: number;
  usersToday: number;
  newRegistrations: number;
  deletedAccounts: number;
  totalUsers: number;
  chartData: { date: string; count: number }[];
  serverStatus: { database: 'ok' | 'error'; server: 'ok' | 'error' };
};

export type AdminProfileDto = {
  id: number;
  email: string;
  name: string | null;
  role: string;
};

export type AdminUserListItem = {
  id: number;
  email: string | null;
  name: string | null;
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
};

export type AdminUserDetail = AdminUserListItem & {
  deletionRequestedAt: string | null;
  scheduledDeleteAt: string | null;
  subscription: {
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    productId: string | null;
    store: string | null;
  } | null;
  subscriptionHistory: { action: string; details: string | null; createdAt: string }[];
  blockHistory: {
    blockedAt: string;
    blockedUntil: string | null;
    reason: string | null;
    unblockedAt: string | null;
  }[];
};

export type PromoCodeDto = {
  id: string;
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  paymentsCount: number;
};

export type PromoStatsDto = {
  code: string;
  usersCount: number;
  byPlan: { planId: string; count: number }[];
  totalAmountRub: number;
  paymentsCount: number;
};

/**
 * Dev: пустой VITE_API_URL → относительные `/api/...` через Vite proxy.
 * Prod: полный URL бэкенда, напр. https://api.runa.finance
 */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  if (import.meta.env.DEV) return '';
  throw new Error('Задайте VITE_API_URL в .env панели (URL бэкенда, напр. https://api.runa.finance)');
}

function apiUrl(path: string): string {
  const base = getApiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_JWT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(ADMIN_JWT_STORAGE_KEY, token);
    else {
      sessionStorage.removeItem(ADMIN_JWT_STORAGE_KEY);
      sessionStorage.removeItem(ADMIN_NAME_STORAGE_KEY);
      sessionStorage.removeItem(ADMIN_ROLE_STORAGE_KEY);
      sessionStorage.removeItem(ADMIN_EMAIL_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function getAdminDisplayName(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_NAME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getAdminRole(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_ROLE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function formatAdminRoleRu(_role?: string | null): string {
  return 'Админ';
}

function setAdminSession(data: {
  token: string;
  name?: string | null;
  role?: string | null;
  email?: string | null;
}): void {
  setAdminToken(data.token);
  try {
    if (data.name?.trim()) sessionStorage.setItem(ADMIN_NAME_STORAGE_KEY, data.name.trim());
    if (data.email?.trim()) sessionStorage.setItem(ADMIN_EMAIL_STORAGE_KEY, data.email.trim());
    sessionStorage.setItem(ADMIN_ROLE_STORAGE_KEY, (data.role || 'admin').trim());
  } catch {
    /* ignore */
  }
}

/** Секрет панели — тот же, что ADMIN_PANEL_KEY на бэкенде. */
function getPanelKeyHeaders(): Record<string, string> {
  const key = import.meta.env.VITE_ADMIN_PANEL_KEY?.trim();
  if (!key) {
    if (import.meta.env.DEV) return {};
    throw new Error('Задайте VITE_ADMIN_PANEL_KEY в .env панели (тот же, что ADMIN_PANEL_KEY на бэкенде)');
  }
  return { 'X-Runa-Panel-Key': key };
}

function getAuthHeaders(): Record<string, string> {
  const jwt = getAdminToken()?.trim();
  if (!jwt) throw new Error('Нет доступа: войдите по email и паролю.');
  return { Authorization: `Bearer ${jwt}`, ...getPanelKeyHeaders() };
}

async function parseError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as {
    message?: string | string[];
    error?: string;
  };
  if (Array.isArray(data.message)) return data.message.join('\n');
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  if (typeof data.error === 'string' && data.error.trim()) return data.error;
  return `Ошибка ${res.status}`;
}

export async function adminJson<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(init?.json !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };
  const res = await fetch(apiUrl(path), {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Вход без OTP — сразу JWT. После 3 ошибок бэкенд блокирует на 5 мин. */
export async function loginAdmin(email: string, password: string): Promise<void> {
  const res = await fetch(apiUrl('/api/admin/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getPanelKeyHeaders() },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    accessToken?: string;
    admin?: { id?: number; email?: string; name?: string | null; role?: string };
    message?: string | string[];
    code?: string;
    retryAfterSeconds?: number;
  };
  if (!res.ok) {
    if (data.code === 'ADMIN_PANEL_KEY_INVALID') {
      throw new Error('Неверный или отсутствующий ключ панели (VITE_ADMIN_PANEL_KEY)');
    }
    if (data.code === 'ADMIN_LOGIN_LOCKED' || res.status === 429) {
      const sec =
        typeof data.retryAfterSeconds === 'number' && data.retryAfterSeconds > 0
          ? data.retryAfterSeconds
          : 300;
      const mins = Math.floor(sec / 60);
      const rem = sec % 60;
      const wait =
        mins > 0 ? `${mins} мин${rem > 0 ? ` ${rem} с` : ''}` : `${sec} с`;
      throw new Error(`Слишком много неверных попыток. Повторите через ${wait}.`);
    }
    const msg = Array.isArray(data.message)
      ? data.message.join('\n')
      : typeof data.message === 'string'
        ? data.message
        : 'Неверный email или пароль';
    throw new Error(msg);
  }
  if (!data.accessToken) throw new Error('Сервер не вернул токен');
  setAdminSession({
    token: data.accessToken,
    name: data.admin?.name ?? 'Админ',
    email: data.admin?.email ?? email.trim(),
    role: 'admin',
  });
}

export async function fetchAdminProfile(): Promise<AdminProfileDto | null> {
  try {
    const profile = await adminJson<AdminProfileDto>('/api/admin/me');
    try {
      if (profile.name?.trim()) sessionStorage.setItem(ADMIN_NAME_STORAGE_KEY, profile.name.trim());
      if (profile.email?.trim()) sessionStorage.setItem(ADMIN_EMAIL_STORAGE_KEY, profile.email.trim());
      sessionStorage.setItem(ADMIN_ROLE_STORAGE_KEY, 'admin');
    } catch {
      /* ignore */
    }
    return profile;
  } catch {
    return null;
  }
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await adminJson('/api/admin/auth/change-password', {
    method: 'POST',
    json: { currentPassword, newPassword },
  });
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return adminJson<DashboardStats>('/api/admin/stats/dashboard');
}

export async function fetchAdminUsers(opts: {
  search?: string;
  userId?: number;
  page?: number;
  limit?: number;
  blockedOnly?: boolean;
}): Promise<{ items: AdminUserListItem[]; total: number; page: number; limit: number }> {
  const q = new URLSearchParams();
  if (opts.search?.trim()) q.set('search', opts.search.trim());
  if (opts.userId != null) q.set('userId', String(opts.userId));
  if (opts.page != null) q.set('page', String(opts.page));
  if (opts.limit != null) q.set('limit', String(opts.limit));
  if (opts.blockedOnly) q.set('blocked', '1');
  const qs = q.toString();
  return adminJson(`/api/admin/users${qs ? `?${qs}` : ''}`);
}

export async function fetchAdminUserDetail(id: number): Promise<AdminUserDetail> {
  return adminJson<AdminUserDetail>(`/api/admin/users/${id}`);
}

export async function blockAdminUser(
  id: number,
  password: string,
  reason?: string,
  until?: string,
): Promise<void> {
  await adminJson(`/api/admin/users/${id}/block`, {
    method: 'POST',
    json: { password, reason, until },
  });
}

export async function unblockAdminUser(id: number, password: string): Promise<void> {
  await adminJson(`/api/admin/users/${id}/unblock`, {
    method: 'POST',
    json: { password },
  });
}

export async function grantUserSubscription(
  id: number,
  password: string,
  days: number,
): Promise<{ success: true; premiumUntil: string | null }> {
  return adminJson(`/api/admin/users/${id}/subscription/grant`, {
    method: 'POST',
    json: { password, days },
  });
}

export async function reduceUserSubscription(
  id: number,
  password: string,
  days: number,
): Promise<{ success: true; premiumUntil: string | null }> {
  return adminJson(`/api/admin/users/${id}/subscription/reduce`, {
    method: 'POST',
    json: { password, days },
  });
}

export async function revokeUserSubscription(id: number, password: string): Promise<void> {
  await adminJson(`/api/admin/users/${id}/subscription/revoke`, {
    method: 'POST',
    json: { password },
  });
}

export async function fetchPromoCodes(): Promise<PromoCodeDto[]> {
  return adminJson<PromoCodeDto[]>('/api/admin/promocodes');
}

export async function createPromoCode(body: {
  code: string;
  name: string;
  discountType: 'RUB' | 'PERCENT';
  discountValue: number;
  validUntil: string;
}): Promise<PromoCodeDto> {
  return adminJson<PromoCodeDto>('/api/admin/promocodes', { method: 'POST', json: body });
}

export async function deletePromoCode(id: string): Promise<void> {
  await adminJson(`/api/admin/promocodes/${id}`, { method: 'DELETE' });
}

export async function fetchPromoStats(id: string): Promise<PromoStatsDto> {
  return adminJson<PromoStatsDto>(`/api/admin/promocodes/${id}/stats`);
}

export function formatIntRu(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n);
}

export function formatDateRu(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatDateTimeRu(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function isUserBlocked(u: { blockedUntil: string | null }): boolean {
  if (!u.blockedUntil) return false;
  return new Date(u.blockedUntil).getTime() > Date.now();
}
