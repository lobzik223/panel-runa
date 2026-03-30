import { useTheme } from '@/contexts/ThemeContext';
import styles from './Section.module.css';
import refStatsStyles from './ReferralStatsPage.module.css';

const TARIFFS = [
  { label: 'Месячная подписка', value: 0 },
  { label: 'Полугодовая подписка', value: 0 },
  { label: 'Годовая подписка', value: 0 },
];

export function ReferralStatsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Статистика рефералки</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Показатели по реферальной программе: пользователи, оплаты и суммы по тарифам.
      </p>

      <div className={styles.cards}>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>
              Пользователей воспользовалось
            </span>
          </div>
          <div className={styles.cardValue}>0</div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>
              Всего оплат
            </span>
          </div>
          <div className={styles.cardValue}>0</div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>
              Общая сумма платежей (с учётом скидки)
            </span>
          </div>
          <div className={styles.cardValue}>0.00 ₽</div>
        </div>
      </div>

      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''} ${refStatsStyles.tariffsBlock} ${isDark ? refStatsStyles.tariffsBlockDark : ''}`}>
        <h2 className={`${refStatsStyles.tariffsTitle} ${isDark ? refStatsStyles.tariffsTitleDark : ''}`}>
          По тарифам
        </h2>
        <ul className={refStatsStyles.tariffsList}>
          {TARIFFS.map((t) => (
            <li
              key={t.label}
              className={refStatsStyles.tariffRow}
            >
              <span className={`${refStatsStyles.tariffLabel} ${isDark ? refStatsStyles.tariffLabelDark : ''}`}>
                {t.label}
              </span>
              <span className={`${refStatsStyles.tariffValue} ${isDark ? refStatsStyles.tariffValueDark : ''}`}>
                {t.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
