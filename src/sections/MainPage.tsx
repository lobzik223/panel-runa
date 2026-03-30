import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './Section.module.css';
import mainStyles from './MainPage.module.css';
import {
  fetchDashboardStats,
  formatIntRu,
  formatPercentOneDecimal,
  type DashboardStats,
} from '@/lib/adminApi';

function regWeekHint(pct: number | null): string {
  if (pct === null) return 'нет сравнения с прошлой неделей';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${formatPercentOneDecimal(pct)}% к прошлой неделе (регистрации)`;
}

export function MainPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDashboardStats();
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) {
          setStats(null);
          setError((e as Error).message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const maxCreated = useMemo(() => {
    if (!stats?.periods.length) return 1;
    return Math.max(1, ...stats.periods.map((p) => p.created));
  }, [stats]);

  const maxDeleted = useMemo(() => {
    if (!stats?.periods.length) return 1;
    return Math.max(1, ...stats.periods.map((p) => p.deleted));
  }, [stats]);

  const conversionOk = stats ? stats.conversionPercent >= stats.conversionGoalPercent : false;

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Главная</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Обзор панели Seepromnt: управление, реферальная программа и документация.
      </p>

      {error ? (
        <p className={`${mainStyles.apiError} ${isDark ? mainStyles.apiErrorDark : ''}`} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.cards}>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Активных пользователей</span>
            <span className={styles.cardBadge}>Сейчас</span>
          </div>
          <div className={styles.cardValue}>
            {loading ? '…' : stats ? formatIntRu(stats.activeUsers) : '—'}
          </div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>
            {loading ? 'загрузка…' : stats ? regWeekHint(stats.registrationsWeekOverWeekPercent) : '—'}
          </div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Рефералов за месяц</span>
            <span className={styles.cardBadgeOrange}>30 дн.</span>
          </div>
          <div className={styles.cardValue}>
            {loading ? '…' : stats ? formatIntRu(stats.referralsLast30Days) : '—'}
          </div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>
            новые аккаунты с referred_by
          </div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Конверсия</span>
            <span
              className={
                loading || !stats
                  ? styles.cardBadge
                  : conversionOk
                    ? styles.cardBadgeGreen
                    : styles.cardBadgeOrange
              }
            >
              {loading || !stats ? '…' : conversionOk ? 'Цель достигнута' : 'Ниже цели'}
            </span>
          </div>
          <div className={styles.cardValue}>
            {loading ? '…' : stats ? `${formatPercentOneDecimal(stats.conversionPercent)}%` : '—'}
          </div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>
            {stats ? `доля с активной подпиской · цель: ${formatPercentOneDecimal(stats.conversionGoalPercent)}%` : '—'}
          </div>
        </div>
      </div>

      <div className={styles.cards}>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Пользователей онлайн</span>
            <span className={styles.cardBadge}>Сейчас</span>
          </div>
          <div className={styles.cardValue}>
            {loading ? '…' : stats ? formatIntRu(stats.onlineUsers) : '—'}
          </div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>
            активность за 15 мин. (чат и задачи)
          </div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Создано аккаунтов</span>
            <span className={styles.cardBadgeOrange}>30 дн.</span>
          </div>
          <div className={styles.cardValue}>
            {loading ? '…' : stats ? formatIntRu(stats.accountsCreatedLast30Days) : '—'}
          </div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>за месяц</div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Удалено аккаунтов</span>
            <span className={`${mainStyles.badgeNeutral} ${isDark ? mainStyles.badgeNeutralDark : ''}`}>30 дн.</span>
          </div>
          <div className={styles.cardValue}>
            {loading ? '…' : stats ? formatIntRu(stats.accountsDeletedLast30Days) : '—'}
          </div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>за месяц (из журнала)</div>
        </div>
      </div>

      <div
        className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''} ${mainStyles.periodBlock} ${isDark ? mainStyles.periodBlockDark : ''}`}
      >
        <h2 className={`${mainStyles.blockTitle} ${isDark ? mainStyles.blockTitleDark : ''}`}>Аккаунты по периодам</h2>
        <p className={`${mainStyles.blockHint} ${isDark ? mainStyles.blockHintDark : ''}`}>
          Созданные и удалённые аккаунты за день, неделю и месяц (данные из БД).
        </p>
        <div className={mainStyles.periodGrid}>
          {(stats?.periods ?? []).map((row) => (
            <div key={row.periodKey} className={mainStyles.periodRow}>
              <span className={`${mainStyles.periodLabel} ${isDark ? mainStyles.periodLabelDark : ''}`}>{row.periodLabel}</span>
              <div className={mainStyles.periodBars}>
                <div className={mainStyles.barWrap}>
                  <span className={`${mainStyles.barLabel} ${isDark ? mainStyles.barLabelDark : ''}`}>Создано</span>
                  <div className={mainStyles.barTrack}>
                    <div
                      className={mainStyles.barFillCreated}
                      style={{ width: `${Math.min(100, (row.created / maxCreated) * 100)}%` }}
                    />
                  </div>
                  <span className={`${mainStyles.barValue} ${isDark ? mainStyles.barValueDark : ''}`}>{row.created}</span>
                </div>
                <div className={mainStyles.barWrap}>
                  <span className={`${mainStyles.barLabel} ${isDark ? mainStyles.barLabelDark : ''}`}>Удалено</span>
                  <div className={mainStyles.barTrack}>
                    <div
                      className={mainStyles.barFillDeleted}
                      style={{ width: `${Math.min(100, (row.deleted / maxDeleted) * 100)}%` }}
                    />
                  </div>
                  <span className={`${mainStyles.barValue} ${isDark ? mainStyles.barValueDark : ''}`}>{row.deleted}</span>
                </div>
              </div>
            </div>
          ))}
          {loading && !stats ? (
            <p className={`${mainStyles.blockHint} ${isDark ? mainStyles.blockHintDark : ''}`}>Загрузка периодов…</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
