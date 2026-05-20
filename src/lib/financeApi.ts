import { adminJson, adminRequest } from './adminApi';

export type FinancePeriod = 'day' | 'week' | 'month';

export function formatRub(n: number): string {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n)} ₽`;
}

export function formatTokens(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

function qsPeriod(period: FinancePeriod, extra?: Record<string, string>) {
  const q = new URLSearchParams({ period, ...extra });
  return q.toString();
}

export async function fetchPaymentStats(period: FinancePeriod = 'month') {
  return adminJson<{
    configured: boolean;
    day: { revenueRub: number; paymentCount: number; averageCheckRub: number; byTier: Record<string, number> };
    week: { revenueRub: number; paymentCount: number; averageCheckRub: number; byTier: Record<string, number> };
    month: { revenueRub: number; paymentCount: number; averageCheckRub: number; byTier: Record<string, number> };
    selected: {
      period: FinancePeriod;
      from: string;
      to: string;
      revenueRub: number;
      paymentCount: number;
      averageCheckRub: number;
      byTier: Record<string, number>;
    };
  }>(`/admin/finance/payments/stats?${qsPeriod(period)}`);
}

export async function fetchPayments(params: {
  period: FinancePeriod;
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
}) {
  const q = new URLSearchParams({ period: params.period });
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  return adminJson<{
    total: number;
    configured: boolean;
    payments: Array<{
      paymentId: string;
      createdAt: string;
      userId: string | null;
      email: string | null;
      planName: string | null;
      tier: string | null;
      amountRub: number;
      status: string;
    }>;
  }>(`/admin/finance/payments?${q.toString()}`);
}

export async function fetchAiCosts(period: FinancePeriod = 'month') {
  return adminJson<{
    totalTokens: number;
    totalCostUsd: number;
    averageTokensPerUser: number;
    tokensByDay: Array<{ date: string; tokens: number }>;
  }>(`/admin/finance/ai-costs?${qsPeriod(period)}`);
}

export async function fetchAiCostsByTier(period: FinancePeriod = 'month') {
  return adminJson<{
    tiers: Array<{ tier: string; userCount: number; avgTokens: number; avgCostUsd: number }>;
  }>(`/admin/finance/ai-costs/by-tier?${qsPeriod(period)}`);
}

export async function fetchAiCostsByAction(period: FinancePeriod = 'month') {
  return adminJson<{
    actions: Array<{ actionType: string; count: number; tokens: number }>;
  }>(`/admin/finance/ai-costs/by-action?${qsPeriod(period)}`);
}

export async function fetchAudienceRegistrations(period: FinancePeriod = 'month') {
  return adminJson<{ days: Array<{ date: string; count: number }> }>(
    `/admin/finance/audience/registrations?${qsPeriod(period)}`
  );
}

export async function fetchAudienceRetention() {
  return adminJson<{ twoOrMorePurchases: number; threeOrMorePurchases: number }>(
    '/admin/finance/audience/retention'
  );
}

export async function fetchAudienceConversion(period: FinancePeriod = 'month') {
  return adminJson<{ registered: number; converted: number; conversionPercent: number }>(
    `/admin/finance/audience/conversion?${qsPeriod(period)}`
  );
}

export async function fetchAudienceFunnel(period: FinancePeriod = 'month') {
  return adminJson<{ registered: number; openedApp: number; purchased: number }>(
    `/admin/finance/audience/funnel?${qsPeriod(period)}`
  );
}

export async function fetchSubscriptionsHistory(limit = 20, offset = 0) {
  return adminJson<{
    total: number;
    rows: Array<{
      userId: string;
      email: string;
      registeredAt: string;
      tier: string;
      purchaseCount: number;
      totalSpentRub: number;
    }>;
  }>(`/admin/finance/audience/subscriptions-history?limit=${limit}&offset=${offset}`);
}

export type FinanceNoteDto = {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  tags: string[];
  includeInReport: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function fetchFinanceNotes(tag?: string) {
  const q = tag ? `?tag=${encodeURIComponent(tag)}` : '';
  return adminJson<{ notes: FinanceNoteDto[] }>(`/admin/finance/notes${q}`);
}

export async function createFinanceNote(body: {
  title: string;
  content: string;
  tags: string[];
  includeInReport: boolean;
}) {
  return adminJson<{ note: FinanceNoteDto }>('/admin/finance/notes', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateFinanceNote(
  id: string,
  body: Partial<{ title: string; content: string; tags: string[]; includeInReport: boolean }>
) {
  return adminJson<{ note: FinanceNoteDto }>(`/admin/finance/notes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteFinanceNote(id: string) {
  const res = await adminRequest(`/admin/finance/notes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    let msg = `Ошибка ${res.status}`;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
}

export async function fetchFinanceReports() {
  return adminJson<{
    reports: Array<{
      id: string;
      periodFrom: string;
      periodTo: string;
      authorName: string;
      createdAt: string;
    }>;
  }>('/admin/finance/reports');
}

export async function downloadFinanceReport(id: string): Promise<Blob> {
  const res = await adminRequest(`/admin/finance/reports/${encodeURIComponent(id)}/download`);
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
  return res.blob();
}

export async function generateFinanceReport(period: FinancePeriod) {
  return adminJson<{
    report: { id: string; periodFrom: string; periodTo: string };
  }>('/admin/finance/reports/generate', {
    method: 'POST',
    body: JSON.stringify({ period }),
  });
}

export async function fetchUserFinanceSummary(userId: string, period: FinancePeriod = 'month') {
  return adminJson<{
    finance: {
      purchaseCount: number;
      totalSpentRub: number;
      sitePaymentsCount: number;
      storePaymentsCount: number;
      payments: Array<{
        source: 'yookassa' | 'store';
        paymentId: string;
        planName: string;
        appliedTier: string;
        appliedAt: string;
        amountRub: number;
        platform?: string;
      }>;
    };
    usage: {
      tier: string;
      limits: {
        chatTokensPeriod: number;
        imageAnalysesPeriod: number;
        slidesPeriod: number;
        pdfPeriod: number;
      };
      text: { usedPeriod: number; usedAllTime: number; limitPeriod: number; unit: 'tokens' | 'count' };
      image: { usedPeriod: number; usedAllTime: number; limitPeriod: number; unit: 'tokens' | 'count' };
      slides: { usedPeriod: number; usedAllTime: number; limitPeriod: number; unit: 'tokens' | 'count' };
      pdf: { usedPeriod: number; usedAllTime: number; limitPeriod: number; unit: 'tokens' | 'count' };
    };
  }>(`/admin/finance/users/${encodeURIComponent(userId)}/summary?${qsPeriod(period)}`);
}

export function formatUsagePair(
  m: { usedPeriod: number; usedAllTime: number; limitPeriod: number; unit: 'tokens' | 'count' },
  mode: 'period' | 'allTime' = 'period'
): string {
  const used = mode === 'period' ? m.usedPeriod : m.usedAllTime;
  if (m.unit === 'tokens') {
    const limit = formatTokens(m.limitPeriod);
    return mode === 'period' ? `${formatTokens(used)} / ${limit}` : formatTokens(used);
  }
  const limit = new Intl.NumberFormat('ru-RU').format(m.limitPeriod);
  return mode === 'period' ? `${used} / ${limit}` : String(used);
}
