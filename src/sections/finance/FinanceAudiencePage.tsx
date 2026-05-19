import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from '../Section.module.css';
import fc from './Finance.module.css';
import { FinancePeriodToolbar } from './FinancePeriodToolbar';
import {
  fetchAudienceConversion,
  fetchAudienceFunnel,
  fetchAudienceRegistrations,
  fetchAudienceRetention,
  fetchSubscriptionsHistory,
  formatRub,
  type FinancePeriod,
} from '@/lib/financeApi';
import { formatIntRu } from '@/lib/adminApi';

export function FinanceAudiencePage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [period, setPeriod] = useState<FinancePeriod>('month');
  const [days, setDays] = useState<Array<{ date: string; count: number }>>([]);
  const [funnel, setFunnel] = useState({ registered: 0, openedApp: 0, purchased: 0 });
  const [retention, setRetention] = useState({ twoOrMorePurchases: 0, threeOrMorePurchases: 0 });
  const [conversion, setConversion] = useState({ registered: 0, converted: 0, conversionPercent: 0 });
  const [history, setHistory] = useState<Awaited<ReturnType<typeof fetchSubscriptionsHistory>> | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reg, f, r, c, h] = await Promise.all([
        fetchAudienceRegistrations(period),
        fetchAudienceFunnel(period),
        fetchAudienceRetention(),
        fetchAudienceConversion(period),
        fetchSubscriptionsHistory(pageSize, page * pageSize),
      ]);
      setDays(reg.days);
      setFunnel(f);
      setRetention(r);
      setConversion(c);
      setHistory(h);
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

  const maxReg = useMemo(() => Math.max(1, ...days.map((d) => d.count)), [days]);
  const totalPages = history ? Math.max(1, Math.ceil(history.total / pageSize)) : 1;

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Анализ аудитории</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Регистрации, воронка, конверсия и история покупок подписок.
      </p>

      <FinancePeriodToolbar period={period} onChange={setPeriod} />
      {error ? <p role="alert">{error}</p> : null}

      <div className={styles.cards}>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Конверсия Free → платный</span>
          <div className={styles.cardValue}>
            {loading ? '…' : `${conversion.conversionPercent}%`}
          </div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Повторные покупки (2+)</span>
          <div className={styles.cardValue}>{loading ? '…' : formatIntRu(retention.twoOrMorePurchases)}</div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Покупки 3+</span>
          <div className={styles.cardValue}>{loading ? '…' : formatIntRu(retention.threeOrMorePurchases)}</div>
        </div>
      </div>

      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''}`} style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Новые регистрации по дням</h2>
        <div className={fc.chartBars}>
          {days.map((d) => (
            <div key={d.date} className={fc.chartBarCol}>
              <div
                className={`${fc.chartBar} ${isDark ? fc.chartBarDark : ''}`}
                style={{ height: `${Math.max(4, (d.count / maxReg) * 120)}px` }}
              />
              <span className={fc.chartBarLabel}>{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''}`} style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Воронка</h2>
        <div className={fc.funnel}>
          <div className={`${fc.funnelStep} ${isDark ? fc.funnelStepDark : ''}`}>
            Зарегистрировались: <strong>{formatIntRu(funnel.registered)}</strong>
          </div>
          <div className={fc.funnelArrow}>↓</div>
          <div className={`${fc.funnelStep} ${isDark ? fc.funnelStepDark : ''}`}>
            Открыли приложение: <strong>{formatIntRu(funnel.openedApp)}</strong>
          </div>
          <div className={fc.funnelArrow}>↓</div>
          <div className={`${fc.funnelStep} ${isDark ? fc.funnelStepDark : ''}`}>
            Купили подписку: <strong>{formatIntRu(funnel.purchased)}</strong>
          </div>
        </div>
      </div>

      <div className={`${styles.tableWrap} ${isDark ? styles.tableWrapDark : ''}`} style={{ marginTop: 24 }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Регистрация</th>
              <th>Тариф</th>
              <th>Покупок</th>
              <th>Потрачено</th>
            </tr>
          </thead>
          <tbody>
            {history?.rows.map((row) => (
              <tr key={row.userId}>
                <td>{row.email}</td>
                <td>{new Date(row.registeredAt).toLocaleDateString('ru-RU')}</td>
                <td>{row.tier}</td>
                <td>{row.purchaseCount}</td>
                <td>{formatRub(row.totalSpentRub)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
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
