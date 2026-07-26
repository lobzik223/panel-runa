import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './Section.module.css';
import mainStyles from './MainPage.module.css';
import { fetchDashboardStats, formatIntRu, type DashboardStats } from '@/lib/adminApi';

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

  const maxChart = useMemo(() => {
    if (!stats?.chartData.length) return 1;
    return Math.max(1, ...stats.chartData.map((p) => p.count));
  }, [stats]);

  const dbOk = stats?.serverStatus.database === 'ok';

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Главная</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Обзор RUNA: регистрации, подписки и активность пользователей.
      </p>

      {error ? (
        <p className={`${mainStyles.apiError} ${isDark ? mainStyles.apiErrorDark : ''}`} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.cards}>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>
              Всего пользователей
            </span>
            <span className={styles.cardBadge}>БД</span>
          </div>
          <div className={styles.cardValue}>
            {loading ? '…' : stats ? formatIntRu(stats.totalUsers) : '—'}
          </div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>
            все аккаунты в системе
          </div>
        </div>

        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Онлайн</span>
            <span className={styles.cardBadge}>10 мин</span>
          </div>
          <div className={styles.cardValue}>
            {loading ? '…' : stats ? formatIntRu(stats.usersOnline) : '—'}
          </div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>
            устройства с активностью
          </div>
        </div>

        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>
              Активные подписки
            </span>
            <span className={styles.cardBadgeGreen}>Premium</span>
          </div>
          <div className={styles.cardValue}>
            {loading ? '…' : stats ? formatIntRu(stats.subscriptionsActive) : '—'}
          </div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>
            status ACTIVE и срок не истёк
          </div>
        </div>
      </div>

      <div className={styles.cards}>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Сегодня</span>
            <span className={styles.cardBadgeOrange}>рег.</span>
          </div>
          <div className={styles.cardValue}>
            {loading ? '…' : stats ? formatIntRu(stats.usersToday) : '—'}
          </div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>
            новые аккаунты за сутки
          </div>
        </div>

        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>
              За 7 дней
            </span>
            <span className={styles.cardBadgeOrange}>рег.</span>
          </div>
          <div className={styles.cardValue}>
            {loading ? '…' : stats ? formatIntRu(stats.newRegistrations) : '—'}
          </div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>
            регистрации за неделю
          </div>
        </div>

        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>
              Запросы на удаление
            </span>
            <span className={styles.cardBadge}>акк.</span>
          </div>
          <div className={styles.cardValue}>
            {loading ? '…' : stats ? formatIntRu(stats.deletedAccounts) : '—'}
          </div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>
            deletionRequestedAt задан · БД: {loading ? '…' : dbOk ? 'ok' : 'error'}
          </div>
        </div>
      </div>

      <div className={`${mainStyles.chartCard} ${isDark ? mainStyles.chartCardDark : ''}`}>
        <div className={mainStyles.chartHeader}>
          <h2 className={`${mainStyles.chartTitle} ${isDark ? mainStyles.chartTitleDark : ''}`}>
            Регистрации за 14 дней
          </h2>
        </div>
        <div className={mainStyles.chartBars}>
          {(stats?.chartData ?? []).map((row) => {
            const h = Math.max(4, Math.round((row.count / maxChart) * 100));
            return (
              <div key={row.date} className={mainStyles.chartCol} title={`${row.date}: ${row.count}`}>
                <div className={mainStyles.chartBarWrap}>
                  <div className={mainStyles.chartBar} style={{ height: `${h}%` }} />
                </div>
                <span className={`${mainStyles.chartLabel} ${isDark ? mainStyles.chartLabelDark : ''}`}>
                  {row.date.slice(5)}
                </span>
                <span className={`${mainStyles.chartCount} ${isDark ? mainStyles.chartCountDark : ''}`}>
                  {row.count}
                </span>
              </div>
            );
          })}
          {!loading && !stats?.chartData.length ? (
            <p className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>Нет данных</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
