import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from '../Section.module.css';
import fc from './Finance.module.css';
import { FinancePeriodToolbar } from './FinancePeriodToolbar';
import {
  fetchAiCosts,
  fetchAiCostsByAction,
  fetchAiCostsByTier,
  formatTokens,
  type FinancePeriod,
} from '@/lib/financeApi';
import { formatIntRu } from '@/lib/adminApi';

const ACTION_LABELS: Record<string, string> = {
  text_generation: 'Текст',
  image_analysis: 'Анализ фото',
  slide_generation: 'Слайды',
  pdf_generation: 'PDF',
};

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'];

export function FinanceAiCostsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [period, setPeriod] = useState<FinancePeriod>('month');
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchAiCosts>> | null>(null);
  const [tiers, setTiers] = useState<Awaited<ReturnType<typeof fetchAiCostsByTier>>['tiers']>([]);
  const [actions, setActions] = useState<Awaited<ReturnType<typeof fetchAiCostsByAction>>['actions']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t, a] = await Promise.all([
        fetchAiCosts(period),
        fetchAiCostsByTier(period),
        fetchAiCostsByAction(period),
      ]);
      setSummary(s);
      setTiers(t.tiers);
      setActions(a.actions);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxTokens = useMemo(
    () => Math.max(1, ...(summary?.tokensByDay.map((d) => d.tokens) ?? [1])),
    [summary]
  );
  const totalActionTokens = useMemo(
    () => actions.reduce((s, a) => s + a.tokens, 0) || 1,
    [actions]
  );

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Расходы на ИИ</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Оценка по событиям чата, генерации презентаций и PDF (токены и стоимость в USD).
      </p>

      <FinancePeriodToolbar period={period} onChange={setPeriod} />
      {error ? <p role="alert">{error}</p> : null}

      <div className={styles.cards}>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Токенов за период</span>
          <div className={styles.cardValue}>
            {loading ? '…' : formatTokens(summary?.totalTokens ?? 0)}
          </div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Расход USD (оценка)</span>
          <div className={styles.cardValue}>
            {loading ? '…' : `$${(summary?.totalCostUsd ?? 0).toFixed(2)}`}
          </div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Среднее на пользователя</span>
          <div className={styles.cardValue}>
            {loading ? '…' : formatTokens(summary?.averageTokensPerUser ?? 0)}
          </div>
        </div>
      </div>

      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''}`} style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Токены по дням</h2>
        <div className={fc.chartBars}>
          {(summary?.tokensByDay ?? []).map((d) => (
            <div key={d.date} className={fc.chartBarCol} title={`${d.date}: ${formatTokens(d.tokens)}`}>
              <div
                className={`${fc.chartBar} ${isDark ? fc.chartBarDark : ''}`}
                style={{ height: `${Math.max(4, (d.tokens / maxTokens) * 120)}px` }}
              />
              <span className={fc.chartBarLabel}>{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.cards} style={{ marginTop: 24 }}>
        <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''}`}>
          <h2 style={{ fontSize: 16 }}>По тарифам</h2>
          <div className={`${styles.tableWrap} ${isDark ? styles.tableWrapDark : ''}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Тариф</th>
                  <th>Пользователей</th>
                  <th>Ср. токены</th>
                  <th>Ср. USD</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t) => (
                  <tr key={t.tier}>
                    <td>{t.tier}</td>
                    <td>{formatIntRu(t.userCount)}</td>
                    <td>{formatTokens(t.avgTokens)}</td>
                    <td>${t.avgCostUsd.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''}`}>
          <h2 style={{ fontSize: 16 }}>Популярные функции</h2>
          <ul className={fc.pieList}>
            {actions.map((a, i) => (
              <li key={a.actionType} className={`${fc.pieRow} ${isDark ? fc.pieRowDark : ''}`}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={fc.pieDot} style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {ACTION_LABELS[a.actionType] ?? a.actionType}
                </span>
                <span>
                  {Math.round((a.tokens / totalActionTokens) * 100)}% · {formatTokens(a.tokens)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
