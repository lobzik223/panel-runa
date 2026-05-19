import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from '../Section.module.css';
import fc from './Finance.module.css';
import { FinancePeriodToolbar } from './FinancePeriodToolbar';
import {
  fetchPaymentStats,
  fetchPayments,
  formatRub,
  type FinancePeriod,
} from '@/lib/financeApi';
import { formatIntRu } from '@/lib/adminApi';

const TIER_LABELS: Record<string, string> = {
  lite: 'Lite',
  pro: 'Pro',
  business: 'Business',
  unknown: 'Другое',
};

export function FinancePaymentsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [period, setPeriod] = useState<FinancePeriod>('month');
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchPaymentStats>> | null>(null);
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof fetchPayments>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p] = await Promise.all([
        fetchPaymentStats(period),
        fetchPayments({ period, limit: pageSize, offset: page * pageSize }),
      ]);
      setStats(s);
      setPayments(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [period, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [period]);

  const totalPages = payments ? Math.max(1, Math.ceil(payments.total / pageSize)) : 1;

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Платежи YooKassa</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Успешные платежи за выбранный период. Данные загружаются с сервера через API ЮKassa.
      </p>

      <FinancePeriodToolbar period={period} onChange={setPeriod} />

      {error ? (
        <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`} role="alert">
          {error}
        </p>
      ) : null}

      {!stats?.configured && !loading ? (
        <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
          YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY не заданы на бэкенде.
        </p>
      ) : null}

      <div className={styles.cards}>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Выручка за день</span>
          </div>
          <div className={styles.cardValue}>{loading ? '…' : formatRub(stats?.day.revenueRub ?? 0)}</div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>За неделю</span>
          </div>
          <div className={styles.cardValue}>{loading ? '…' : formatRub(stats?.week.revenueRub ?? 0)}</div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>За месяц</span>
          </div>
          <div className={styles.cardValue}>{loading ? '…' : formatRub(stats?.month.revenueRub ?? 0)}</div>
        </div>
      </div>

      <div className={styles.cards}>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Платежей (период)</span>
          </div>
          <div className={styles.cardValue}>
            {loading ? '…' : formatIntRu(stats?.selected.paymentCount ?? 0)}
          </div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Средний чек</span>
          </div>
          <div className={styles.cardValue}>{loading ? '…' : formatRub(stats?.selected.averageCheckRub ?? 0)}</div>
        </div>
      </div>

      {stats?.selected.byTier ? (
        <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''}`} style={{ marginBottom: 24 }}>
          <h2 className={`${styles.title} ${isDark ? styles.titleDark : ''}`} style={{ fontSize: 16 }}>
            По тарифам
          </h2>
          <div className={fc.tierGrid}>
            {Object.entries(stats.selected.byTier).map(([k, v]) => (
              <div key={k} className={`${fc.tierChip} ${isDark ? fc.tierChipDark : ''}`}>
                <div style={{ fontWeight: 600 }}>{TIER_LABELS[k] ?? k}</div>
                <div style={{ fontSize: 22, marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={`${styles.tableWrap} ${isDark ? styles.tableWrapDark : ''}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Пользователь</th>
              <th>Тариф</th>
              <th>Сумма</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {loading && !payments?.payments.length ? (
              <tr>
                <td colSpan={5}>Загрузка…</td>
              </tr>
            ) : payments?.payments.length ? (
              payments.payments.map((p) => (
                <tr key={p.paymentId}>
                  <td>{new Date(p.createdAt).toLocaleString('ru-RU')}</td>
                  <td>{p.email || p.userId?.slice(0, 8) || '—'}</td>
                  <td>{p.planName || p.tier || '—'}</td>
                  <td>{formatRub(p.amountRub)}</td>
                  <td>{p.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>Нет платежей за период</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'center' }}>
        <button type="button" disabled={page <= 0 || loading} onClick={() => setPage((p) => p - 1)}>
          Назад
        </button>
        <span>
          Стр. {page + 1} / {totalPages}
        </span>
        <button type="button" disabled={page >= totalPages - 1 || loading} onClick={() => setPage((p) => p + 1)}>
          Вперёд
        </button>
      </div>
    </section>
  );
}
