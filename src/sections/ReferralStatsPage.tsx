import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './Section.module.css';
import s from './ReferralStatsPage.module.css';
import {
  fetchPromoCodes,
  fetchPromoStats,
  formatIntRu,
  type PromoCodeDto,
  type PromoStatsDto,
} from '@/lib/adminApi';

type Row = PromoCodeDto & { stats?: PromoStatsDto | null };

const PLAN_LABELS: Record<string, string> = {
  '1month': '1 мес.',
  '6months': '6 мес.',
  '1year': '1 год',
};

export function ReferralStatsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchPromoCodes();
        const withStats: Row[] = [];
        for (const p of list) {
          try {
            const stats = await fetchPromoStats(p.id);
            withStats.push({ ...p, stats });
          } catch {
            withStats.push({ ...p, stats: null });
          }
        }
        if (!cancelled) setRows(withStats);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = rows.reduce(
    (acc, r) => {
      acc.payments += r.stats?.paymentsCount ?? r.paymentsCount ?? 0;
      acc.users += r.stats?.usersCount ?? 0;
      acc.rub += r.stats?.totalAmountRub ?? 0;
      return acc;
    },
    { payments: 0, users: 0, rub: 0 },
  );

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Статистика промокодов</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Успешные оплаты ЮKassa по промокодам.
      </p>

      {error ? <p className={s.error}>{error}</p> : null}

      <div className={styles.cards}>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Оплат</span>
          </div>
          <div className={styles.cardValue}>{loading ? '…' : formatIntRu(totals.payments)}</div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>
              Уникальных юзеров
            </span>
          </div>
          <div className={styles.cardValue}>{loading ? '…' : formatIntRu(totals.users)}</div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Сумма, ₽</span>
          </div>
          <div className={styles.cardValue}>
            {loading ? '…' : formatIntRu(Math.round(totals.rub))}
          </div>
        </div>
      </div>

      <div className={`${s.table} ${isDark ? s.tableDark : ''}`}>
        {loading ? <p className={s.muted}>Загрузка…</p> : null}
        {!loading && rows.length === 0 ? <p className={s.muted}>Нет промокодов</p> : null}
        {rows.map((r) => (
          <div key={r.id} className={s.row}>
            <div className={s.code}>{r.code}</div>
            <div className={s.meta}>{r.name}</div>
            <div className={s.meta}>
              оплат: {r.stats?.paymentsCount ?? r.paymentsCount} · юзеров: {r.stats?.usersCount ?? '—'} ·{' '}
              {Math.round(r.stats?.totalAmountRub ?? 0)} ₽
            </div>
            <div className={s.plans}>
              {(r.stats?.byPlan ?? []).map((p) => (
                <span key={p.planId} className={s.planChip}>
                  {PLAN_LABELS[p.planId] || p.planId}: {p.count}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
