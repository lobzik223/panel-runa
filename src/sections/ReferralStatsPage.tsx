import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchReferralStats } from '@/lib/adminApi';
import styles from './Section.module.css';
import refStatsStyles from './ReferralStatsPage.module.css';

const TARIFFS = [
  { label: 'Месячная подписка', key: 'monthly' as const },
  { label: 'Полугодовая подписка', key: 'halfyear' as const },
  { label: 'Годовая подписка', key: 'yearly' as const },
];

function formatRub(n: number): string {
  return `${n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

export function ReferralStatsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usersReferred, setUsersReferred] = useState(0);
  const [referredWithPaid, setReferredWithPaid] = useState(0);
  const [paymentsRub, setPaymentsRub] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const stats = await fetchReferralStats();
        if (cancelled) return;
        setUsersReferred(stats.usersReferred);
        setReferredWithPaid(stats.referredWithPaid);
        setPaymentsRub(stats.paymentsRubEstimate);
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

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Статистика рефералки</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Показатели по реферальной программе: пользователи, оплаты и оценка суммы по тарифам Lite / Pro / Business.
      </p>

      {error ? (
        <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`} style={{ color: '#c0392b' }} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.cards}>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>
              Пользователей воспользовалось
            </span>
          </div>
          <div className={styles.cardValue}>{loading ? '…' : usersReferred}</div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Всего оплат</span>
          </div>
          <div className={styles.cardValue}>{loading ? '…' : referredWithPaid}</div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>
              Оценка суммы платежей
            </span>
          </div>
          <div className={styles.cardValue}>{loading ? '…' : formatRub(paymentsRub)}</div>
        </div>
      </div>

      <div
        className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''} ${refStatsStyles.tariffsBlock} ${isDark ? refStatsStyles.tariffsBlockDark : ''}`}
      >
        <h2 className={`${refStatsStyles.tariffsTitle} ${isDark ? refStatsStyles.tariffsTitleDark : ''}`}>
          По тарифам
        </h2>
        <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
          Детальная разбивка по периодам подписки появится после расширения отчёта на бэкенде. Сейчас сумма считается по
          номиналам Lite (390 ₽), Pro (1350 ₽), Business (2300 ₽).
        </p>
        <ul className={refStatsStyles.tariffsList}>
          {TARIFFS.map((t) => (
            <li key={t.label} className={refStatsStyles.tariffRow}>
              <span className={`${refStatsStyles.tariffLabel} ${isDark ? refStatsStyles.tariffLabelDark : ''}`}>
                {t.label}
              </span>
              <span className={`${refStatsStyles.tariffValue} ${isDark ? refStatsStyles.tariffValueDark : ''}`}>
                {loading ? '…' : '—'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
