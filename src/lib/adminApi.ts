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
const ADMIN_ROLE_STORAGE_KEY = 'seepromnt_admin_role';
const ADMIN_EMAIL_STORAGE_KEY = 'seepromnt_admin_email';

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

/** Роль из ответа логина: `superadmin` | `admin` */
export function getAdminRole(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_ROLE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setAdminSessionFromProfile(data: {
  name?: string | null;
  email?: string | null;
  role?: string | null;
}): void {
  try {
    if (typeof data.name === 'string' && data.name.trim()) {
      sessionStorage.setItem(ADMIN_NAME_STORAGE_KEY, data.name.trim());
    }
    if (typeof data.email === 'string' && data.email.trim()) {
      sessionStorage.setItem(ADMIN_EMAIL_STORAGE_KEY, data.email.trim());
    }
    if (typeof data.role === 'string' && data.role.trim()) {
      sessionStorage.setItem(ADMIN_ROLE_STORAGE_KEY, data.role.trim());
    }
  } catch {
    /* ignore */
  }
}

export type AdminProfileDto = {
  id: string | null;
  email: string | null;
  name: string;
  role: string;
};

/** Подпись роли для UI (RU). */
export function formatAdminRoleRu(role: string | null | undefined): string {
  const r = (role || '').toLowerCase();
  if (r === 'superadmin') return 'Главный администратор';
  if (r === 'admin') return 'Администратор';
  return 'Администратор';
}

/** Заголовок X-Seepromnt-Panel-Key — тот же секрет, что ADMIN_PANEL_CLIENT_SECRET на бэкенде. */
function getPanelClientSecretHeaders(): Record<string, string> {
  const s = import.meta.env.VITE_ADMIN_PANEL_CLIENT_SECRET?.trim();
  if (!s) return {};
  return { 'X-Seepromnt-Panel-Key': s };
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

function applyAdminSessionFromLoginPayload(data: {
  token: string;
  name?: string;
  role?: string;
  email?: string;
}): void {
  setAdminToken(data.token);
  try {
    if (typeof data.name === 'string' && data.name.trim()) {
      sessionStorage.setItem(ADMIN_NAME_STORAGE_KEY, data.name.trim());
    }
    if (typeof data.role === 'string' && data.role.trim()) {
      sessionStorage.setItem(ADMIN_ROLE_STORAGE_KEY, data.role.trim());
    }
    if (typeof data.email === 'string' && data.email.trim()) {
      sessionStorage.setItem(ADMIN_EMAIL_STORAGE_KEY, data.email.trim());
    }
  } catch {
    /* ignore */
  }
}

export type RequestPanelLoginResult =
  | {
      requiresOtp: true;
      challengeId: string;
      emailMask: string;
      expiresInSeconds: number;
      /** Сервер: panel-admin-login RESEND_COOLDOWN_MS (секунды до повторной отправки). */
      resendCooldownSeconds: number;
      /** Почта ещё не подтверждена — код подтверждает владение адресом. */
      emailVerificationPending: boolean;
    }
  | { requiresOtp: false };

/** Шаг 1: верные email+пароль → либо доверенная сессия 24ч (без кода), либо код на почту. */
export async function requestPanelLogin(email: string, password: string): Promise<RequestPanelLoginResult> {
  const base = getApiBase();
  const path = '/admin/auth/login';
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getPanelClientSecretHeaders(),
    },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    challengeId?: string;
    emailMask?: string;
    expiresInSeconds?: number;
    retryAfterSeconds?: number;
    token?: string;
    name?: string;
    role?: string;
    email?: string;
    resendCooldownSeconds?: number;
    emailVerificationPending?: boolean;
  };
  if (data.code === 'PANEL_LOGIN_IP_LOCKED' && typeof data.retryAfterSeconds === 'number') {
    throw new Error(`PANEL_LOGIN_IP_LOCKED:${data.retryAfterSeconds}`);
  }
  if (data.code === 'PANEL_SESSION_TRUSTED' && data.token) {
    applyAdminSessionFromLoginPayload({
      token: data.token,
      name: data.name,
      role: data.role,
      email: data.email,
    });
    return { requiresOtp: false };
  }
  if (data.code === 'ADMIN_PANEL_PUBLIC_URL_MISSING') {
    throw new Error(
      'На сервере не задан ADMIN_PANEL_PUBLIC_URL (URL панели для ссылок в письмах).',
    );
  }
  if (!res.ok || data.code !== 'PANEL_OTP_REQUIRED' || !data.challengeId) {
    const msg = typeof data.error === 'string' ? data.error : `Ошибка ${res.status}`;
    throw new Error(msg);
  }
  const resendCooldownSeconds =
    typeof data.resendCooldownSeconds === 'number' && data.resendCooldownSeconds > 0 ? data.resendCooldownSeconds : 300;
  return {
    requiresOtp: true,
    challengeId: data.challengeId,
    emailMask: data.emailMask ?? '***',
    expiresInSeconds: data.expiresInSeconds ?? 900,
    resendCooldownSeconds,
    emailVerificationPending: Boolean(data.emailVerificationPending),
  };
}

/** Шаг 2: код из письма → JWT и сессия панели. */
export async function verifyPanelLoginOtp(params: {
  challengeId: string;
  email: string;
  code: string;
}): Promise<{ token: string }> {
  const base = getApiBase();
  const path = '/admin/auth/verify-login-otp';
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getPanelClientSecretHeaders(),
    },
    body: JSON.stringify({
      challengeId: params.challengeId,
      email: params.email.trim(),
      code: params.code.trim(),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    token?: string;
    error?: string;
    code?: string;
    name?: string;
    role?: string;
    email?: string;
  };
  if (!res.ok || !data.token) {
    const msg = typeof data.error === 'string' ? data.error : `Ошибка ${res.status}`;
    throw new Error(msg);
  }
  applyAdminSessionFromLoginPayload({
    token: data.token,
    name: data.name,
    role: data.role,
    email: data.email,
  });
  return { token: data.token };
}

export async function resendPanelLoginOtp(
  challengeId: string,
  email: string
): Promise<{ expiresInSeconds: number; resendCooldownSeconds: number }> {
  const base = getApiBase();
  const path = '/admin/auth/resend-login-otp';
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getPanelClientSecretHeaders(),
    },
    body: JSON.stringify({ challengeId, email: email.trim() }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    expiresInSeconds?: number;
    retryAfterSeconds?: number;
    resendCooldownSeconds?: number;
  };
  if (data.code === 'PANEL_OTP_RESEND_COOLDOWN' && typeof data.retryAfterSeconds === 'number') {
    throw new Error(`COOLDOWN:${data.retryAfterSeconds}`);
  }
  if (!res.ok) {
    const msg = typeof data.error === 'string' ? data.error : `Ошибка ${res.status}`;
    throw new Error(msg);
  }
  const resendCooldownSeconds =
    typeof data.resendCooldownSeconds === 'number' && data.resendCooldownSeconds > 0 ? data.resendCooldownSeconds : 300;
  return { expiresInSeconds: data.expiresInSeconds ?? 900, resendCooldownSeconds };
}

/** Отмена сессии ввода кода (кнопка «Назад») — challenge удаляется на сервере. */
export async function abandonPanelLoginChallenge(challengeId: string, email: string): Promise<void> {
  const base = getApiBase();
  const path = '/admin/auth/abandon-login-challenge';
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getPanelClientSecretHeaders(),
    },
    body: JSON.stringify({ challengeId, email: email.trim() }),
  });
  if (res.status === 401) return;
  await res.json().catch(() => ({}));
}

/** Удаление админа по ссылке из письма (токен + пароль). */
export async function deleteAdminWithToken(token: string, password: string): Promise<void> {
  const base = getApiBase();
  const path = '/admin/auth/delete-with-token';
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getPanelClientSecretHeaders(),
    },
    body: JSON.stringify({ token: token.trim(), password }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!res.ok) {
    const msg = typeof data.error === 'string' ? data.error : `Ошибка ${res.status}`;
    throw new Error(msg);
  }
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
      headers: {
        ...getPanelClientSecretHeaders(),
        ...auth,
      },
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
  /** Записей привязки устройства (хэш HMAC в БД, не сырой ID). */
  deviceBindingCount: number;
  /** Причина блокировки квот (из панели) */
  adminBlockReason: string | null;
  /** Метка soft-delete. Если не null — аккаунт "заморожен" и будет жёстко удалён после льготного периода. */
  deletedAt: string | null;
  /** До какой даты аккаунт можно восстановить (deletedAt + 30 дней). */
  restorableUntil: string | null;
  /** Сколько дней осталось до жёсткого удаления (целое, с округлением вверх). */
  frozenDaysLeft: number | null;
  /** Сколько раз этот аккаунт уходил в soft-delete (для анти-абьюза и статистики). */
  deletionCount: number;
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
        ...getPanelClientSecretHeaders(),
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

/** Профиль из БД; при 401 сбрасывает сессию. */
export async function fetchAdminProfile(): Promise<AdminProfileDto | null> {
  const res = await adminRequest('/admin/auth/me');
  if (res.status === 401) {
    setAdminToken(null);
    return null;
  }
  if (!res.ok) {
    return null;
  }
  const data = (await res.json()) as AdminProfileDto;
  setAdminSessionFromProfile(data);
  return data;
}

export type SystemMetricsDto = {
  process: { uptimeSec: number; nodeVersion: string; pid: number };
  system: {
    hostname: string;
    platform: string;
    uptimeSec: number;
    load1: number;
    load5: number;
    load15: number;
    memory: {
      totalBytes: number;
      freeBytes: number;
      usedBytes: number;
      usedPercent: number | null;
    };
  };
  memory: { rss: number; heapTotal: number; heapUsed: number; external: number };
  disk: {
    path: string;
    totalBytes: number | null;
    freeBytes: number | null;
    usedPercent: number | null;
  } | null;
  database: { usersTotal: number; panelAdmins: number; ok: boolean };
  grok: { configured: boolean; keyHint: string };
  adminApi: { requestsByHourToday: number[]; requestsTodayApprox: number };
  ddos: {
    notes: string;
    incidentsLast7Days: Array<{
      id: string;
      date: string;
      time: string;
      reason: string;
      resolution: string;
    }>;
  };
};

export async function fetchSystemMetrics(): Promise<SystemMetricsDto> {
  return adminJson('/admin/system/metrics');
}

export type PanelAccessLogEntryDto = {
  ts: string;
  ip: string;
  method: string;
  path: string;
  statusCode: number;
  kind: string;
  userAgent?: string;
  note?: string;
};

/** Журнал доступа к панели: не более 50 последних записей (сервер тоже ограничивает). */
export async function fetchSecurityAccessLog(limit = 50): Promise<{ entries: PanelAccessLogEntryDto[] }> {
  const capped = Math.min(50, Math.max(1, limit));
  return adminJson(`/admin/security/access-log?limit=${encodeURIComponent(String(capped))}`);
}

export async function fetchBlockedPanelIps(): Promise<{ ips: string[] } | null> {
  const res = await adminRequest('/admin/security/blocked-ips');
  if (res.status === 403) return null;
  if (!res.ok) return null;
  return res.json() as Promise<{ ips: string[] }>;
}

export async function postBlockPanelIp(ip: string): Promise<{ ok: boolean; blocked: string[] }> {
  return adminJson('/admin/security/block-ip', {
    method: 'POST',
    body: JSON.stringify({ ip }),
  });
}

export async function deleteBlockPanelIp(ip: string): Promise<{ ok: boolean; blocked: string[] }> {
  return adminJson(`/admin/security/block-ip/${encodeURIComponent(ip)}`, {
    method: 'DELETE',
  });
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

/** Сброс привязки устройства к регистрации (хэши в БД). Вход Google/Apple не отключается. */
export async function postClearUserDeviceBindings(userId: string): Promise<{
  ok: boolean;
  bindingsRemoved: number;
  user: AdminUserDto;
}> {
  return adminJson(`/admin/users/${encodeURIComponent(userId)}/clear-device-bindings`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** Lite + истёкшая оплата и триал (запрос Apple на демо с expired subscription). */
export async function postAppReviewExpiredDemo(userId: string): Promise<{
  ok: boolean;
  user: AdminUserDto;
  entitlements: AdminEntitlementDto[];
}> {
  return adminJson(`/admin/users/${encodeURIComponent(userId)}/app-review-expired-demo`, {
    method: 'POST',
    body: JSON.stringify({}),
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

// ─── Site reviews (модерация отзывов с лендинга) ─────────────────

export type SiteReviewAdminDto = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  body: string;
  roleLabel: string | null;
  approved: boolean;
  isDemo: boolean;
  sortOrder: number;
  createdAt: string;
};

export type SiteReviewFilter = 'all' | 'demo' | 'user';

export async function fetchSiteReviews(filter: SiteReviewFilter = 'all'): Promise<{ reviews: SiteReviewAdminDto[] }> {
  const qs = new URLSearchParams({ filter });
  return adminJson(`/admin/site-reviews?${qs.toString()}`);
}

export async function patchSiteReview(
  id: string,
  body: { approved: boolean }
): Promise<{ review: SiteReviewAdminDto }> {
  return adminJson(`/admin/site-reviews/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteSiteReview(id: string): Promise<void> {
  const res = await adminRequest(`/admin/site-reviews/${encodeURIComponent(id)}`, {
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
