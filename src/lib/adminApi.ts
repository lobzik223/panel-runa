export type DashboardPeriodRow = {
  periodKey: 'day' | 'week' | 'month';
  periodLabel: string;
  created: number;
  deleted: number;
};

export type DashboardStats = {
  activeUsers: number;
  registrationsWeekOverWeekPercent: number | null;
  referralsLast30Days: number;
  conversionPercent: number;
  conversionGoalPercent: number;
  onlineUsers: number;
  accountsCreatedLast30Days: number;
  accountsDeletedLast30Days: number;
  periods: DashboardPeriodRow[];
};

const ADMIN_JWT_STORAGE_KEY = 'seepromnt_admin_jwt';
const ADMIN_NAME_STORAGE_KEY = 'seepromnt_admin_name';

/**
 * В dev: пустой VITE_API_URL → относительные URL (`/admin/...`), Vite проксирует на 127.0.0.1:4000.
 * В production-сборке нужен полный URL бэкенда.
 */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return '';
  }
  throw new Error('Задайте VITE_API_URL в .env панели (URL бэкенда для production-сборки)');
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

/** Заголовки для /admin: JWT после POST /admin/auth/login или X-Admin-Key (dev / скрипты). */
function getAdminAuthHeaders(): Record<string, string> {
  const jwt = getAdminToken()?.trim();
  if (jwt) return { Authorization: `Bearer ${jwt}` };
  const key = import.meta.env.VITE_ADMIN_API_KEY?.trim();
  if (key) return { 'X-Admin-Key': key };
  throw new Error(
    'Нет доступа к админ-API: войдите по email и паролю или задайте VITE_ADMIN_API_KEY (только dev).'
  );
}

export async function loginPanelAdmin(email: string, password: string): Promise<{ token: string }> {
  const base = getApiBase();
  const path = '/admin/auth/login';
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    token?: string;
    error?: string;
    code?: string;
    name?: string;
  };
  if (data.code === 'EMAIL_NOT_VERIFIED') {
    throw new Error('EMAIL_NOT_VERIFIED');
  }
  if (!res.ok || !data.token) {
    const msg = typeof data.error === 'string' ? data.error : `Ошибка ${res.status}`;
    throw new Error(msg);
  }
  setAdminToken(data.token);
  try {
    if (typeof data.name === 'string' && data.name.trim()) {
      sessionStorage.setItem(ADMIN_NAME_STORAGE_KEY, data.name.trim());
    }
  } catch {
    /* ignore */
  }
  return { token: data.token };
}

function networkHint(url: string): string {
  return (
    `Сервер не отвечает (${url || '/admin/stats'}). Запустите бэкенд: «npm run dev» или «docker compose up -d» ` +
    `в папке Backend-Seepromnt (порт 4000). В dev можно оставить VITE_API_URL пустым — используется прокси Vite. ` +
    `Иначе укажите в .env реальный URL API (тот же хост, что в браузере, если бэкенд не на этом ПК).`
  );
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const base = getApiBase();
  const auth = getAdminAuthHeaders();
  const path = '/admin/stats';
  const url = base ? `${base}${path}` : path;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: auth,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
      throw new Error(networkHint(url));
    }
    throw e;
  }
  if (!res.ok) {
    const text = await res.text();
    let msg = `Ошибка ${res.status}`;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      if (text) msg = text.slice(0, 200);
    }
    throw new Error(msg);
  }
  return res.json() as Promise<DashboardStats>;
}

export function formatIntRu(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n);
}

export function formatPercentOneDecimal(n: number): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n);
}

// ─── Users (admin) ─────────────────────────────────────────

export type AdminUserDto = {
  id: string;
  email: string;
  name: string;
  subscriptionTier: string;
  paidSubscriptionExpiresAt: string | null;
  freeTrialStartedAt: string | null;
  freeTrialExpiresAt: string | null;
  freeQuotaSuspended: boolean;
  referredByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  devicePlatform: string | null;
  /** Причина блокировки квот (из панели) */
  adminBlockReason: string | null;
};

export type AdminEntitlementDto = {
  id: string;
  platform: string;
  productId: string;
  expiresAt: string;
  createdAt: string;
};

async function adminRequest(path: string, init?: RequestInit): Promise<Response> {
  const base = getApiBase();
  const auth = getAdminAuthHeaders();
  const url = base ? `${base}${path}` : path;
  try {
    return await fetch(url, {
      ...init,
      headers: {
        ...auth,
        ...init?.headers,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
      throw new Error(networkHint(url));
    }
    throw e;
  }
}

async function adminJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await adminRequest(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let errMsg = `Ошибка ${res.status}`;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j.error) errMsg = j.error;
    } catch {
      if (text) errMsg = text.slice(0, 200);
    }
    throw new Error(errMsg);
  }
  return res.json() as Promise<T>;
}

export async function fetchBlockedUsers(): Promise<{ users: AdminUserDto[] }> {
  return adminJson('/admin/blocked-users');
}

export async function fetchAdminUsers(params: { q?: string; limit?: number; offset?: number }): Promise<{
  total: number;
  users: AdminUserDto[];
}> {
  const q = params.q ?? '';
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const qs = new URLSearchParams({
    q,
    limit: String(limit),
    offset: String(offset),
  });
  return adminJson(`/admin/users?${qs.toString()}`);
}

export async function fetchAdminUserDetail(userId: string): Promise<{
  user: AdminUserDto;
  entitlements: AdminEntitlementDto[];
}> {
  return adminJson(`/admin/users/${encodeURIComponent(userId)}`);
}

export async function patchAdminUser(
  userId: string,
  body: {
    subscriptionTier?: 'free' | 'lite' | 'pro' | 'business';
    freeQuotaSuspended?: boolean;
    blockReason?: string;
    paidSubscriptionExpiresAt?: string | null;
    clearTrial?: boolean;
  }
): Promise<{ user: AdminUserDto; entitlements: AdminEntitlementDto[] }> {
  return adminJson(`/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

// ─── Data links (графики и данные) ─────────────────────────

export type DataLinkType = 'excel' | 'google-sheets' | 'google-docs';

export type DataLinkDto = {
  id: string;
  title: string;
  description: string;
  url: string;
  type: DataLinkType;
  createdAt: string;
  updatedAt: string;
};

export async function fetchDataLinks(): Promise<{ links: DataLinkDto[] }> {
  return adminJson('/admin/data-links');
}

export async function createDataLink(body: {
  title: string;
  description?: string;
  url: string;
  linkType: DataLinkType;
}): Promise<{ link: DataLinkDto }> {
  return adminJson('/admin/data-links', {
    method: 'POST',
    body: JSON.stringify({
      title: body.title,
      description: body.description ?? '',
      url: body.url,
      linkType: body.linkType,
    }),
  });
}

export async function deleteDataLink(id: string): Promise<void> {
  const res = await adminRequest(`/admin/data-links/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (res.ok) return;
  const text = await res.text();
  let errMsg = `Ошибка ${res.status}`;
  try {
    const j = JSON.parse(text) as { error?: string };
    if (j.error) errMsg = j.error;
  } catch {
    if (text) errMsg = text.slice(0, 200);
  }
  throw new Error(errMsg);
}
