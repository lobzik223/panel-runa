import { useTheme } from '@/contexts/ThemeContext';
import styles from './Section.module.css';
import s from './ServerPage.module.css';

/* Демо-данные: хранилище (ГБ) */
const STORAGE_TOTAL_GB = 500;
const STORAGE_USED_GB = 127;
const STORAGE_PERCENT = Math.round((STORAGE_USED_GB / STORAGE_TOTAL_GB) * 100);

function storageStatus(percent: number): string {
  if (percent >= 90) return 'Критично';
  if (percent >= 70) return 'Внимание';
  return 'Норма';
}

/* Демо: стабильность после регистраций/входов */
const STABILITY_PERCENT = 99.4;

/* Демо: трафик по часам за сегодня (условные единицы, обновляется каждый час) */
const TRAFFIC_HOURLY = [
  12, 8, 5, 4, 6, 14, 28, 45, 62, 78, 85, 88, 82, 75, 70, 68, 72, 80, 75, 58, 42, 28, 18, 14,
];
const TRAFFIC_MAX = Math.max(...TRAFFIC_HOURLY);

/* Демо: токены нейросети GROK */
const GROK_TOKENS_PER_DAY = 124_800;
const GROK_TOKENS_PER_MONTH = 3_244_000;

/* Демо: база данных */
const DB_TOTAL_ACCOUNTS = 12_847;
const DB_STATUS = 'Работает' as const;
const DB_ERRORS: string[] = [];

/* Демо: DDoS-атаки — было / не было и инциденты с причиной и решением */
const DDOS_HAD_ATTACKS = false; // поставить true, чтобы увидеть пример инцидентов
interface DdosIncident {
  id: string;
  date: string;
  time: string;
  reason: string;
  resolution: string;
}
const DDOS_INCIDENTS: DdosIncident[] = DDOS_HAD_ATTACKS
  ? [
      {
        id: 'ddos-1',
        date: '14.03.2026',
        time: '09:12 – 09:47',
        reason: 'Массовые запросы с поддельных IP (ботнет). Резкий рост запросов к API авторизации и генерации.',
        resolution: 'Включена rate-limit по IP, подключён Cloudflare. Трафик отфильтрован, сервис восстановлен за 35 мин.',
      },
      {
        id: 'ddos-2',
        date: '10.03.2026',
        time: '22:30 – 23:15',
        reason: 'Слоулор-атака на эндпоинты загрузки медиа. Долгие соединения без разрыва.',
        resolution: 'Ограничено время жизни соединения, добавлены таймауты. Атака прекратилась после блокировки подсетей.',
      },
    ]
  : [];

export function ServerPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const dk = isDark ? ' ' + s.dk : '';
  const status = storageStatus(STORAGE_PERCENT);
  let statusClass = s.statusOk;
  if (status === 'Критично') statusClass = s.statusCritical;
  else if (status === 'Внимание') statusClass = s.statusWarning;

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Серверная часть</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Хранилище, стабильность, трафик и состояние базы данных. Данные обновляются каждый час.
      </p>

      {/* ═══ Верхний ряд: Хранилище, Стабильность, Сводка трафика ═══ */}
      <div className={styles.cards}>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>
              Хранилище сервера
            </span>
            <span className={`${s.statusBadge} ${statusClass}`}>{status}</span>
          </div>
          <div className={styles.cardValue}>
            {STORAGE_USED_GB} / {STORAGE_TOTAL_GB} ГБ
          </div>
          <div className={s.storageBarWrap}>
            <div className={`${s.storageBarTrack}${dk}`}>
              <div
                className={s.storageBarFill}
                style={{ width: `${Math.min(100, STORAGE_PERCENT)}%` }}
              />
            </div>
            <span className={`${s.storageBarLabel}${dk}`}>Заполнено {STORAGE_PERCENT}%</span>
          </div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>
            Диапазон 0–{STORAGE_TOTAL_GB} ГБ. Рекомендуется держать ниже 80%.
          </div>
        </div>

        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>
              Стабильность
            </span>
            <span className={styles.cardBadgeGreen}>Калибровка</span>
          </div>
          <div className={styles.cardValue}>
            {STABILITY_PERCENT}%
          </div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>
            После регистраций и входов. Uptime за последние 24 ч.
          </div>
        </div>

        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>
              Трафик за сегодня
            </span>
            <span className={styles.cardBadge}>Почасово</span>
          </div>
          <div className={styles.cardValue}>
            {TRAFFIC_HOURLY.reduce((a, b) => a + b, 0)}
          </div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>
            Условные единицы. График ниже обновляется каждый час.
          </div>
        </div>
      </div>

      {/* ═══ График трафика за сегодня ═══ */}
      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''} ${s.trafficBlock}`}>
        <h2 className={`${s.blockTitle} ${isDark ? s.blockTitleDark : ''}`}>Трафик по часам (сегодня)</h2>
        <p className={`${s.blockHint}${dk}`}>
          Обновляется каждый час. Ось X — часы (0–23), ось Y — условная нагрузка.
        </p>
        <div className={`${s.chartArea}${dk}`}>
          <div className={s.chartBars}>
            {TRAFFIC_HOURLY.map((value, hour) => (
              <div
                key={`hour-${hour}`}
                className={s.chartBar}
                style={{
                  height: `${TRAFFIC_MAX > 0 ? (value / TRAFFIC_MAX) * 100 : 0}%`,
                }}
                title={`${hour}:00 — ${value}`}
              />
            ))}
          </div>
          <div className={`${s.chartLabels}${dk}`}>
            {Array.from({ length: 24 }, (_, hour) => (
              <span key={`label-${hour}`} className={s.chartLabel}>
                {hour}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Токены нейросети GROK ═══ */}
      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''} ${s.tokensBlock}`}>
        <h2 className={`${s.blockTitle} ${isDark ? s.blockTitleDark : ''}`}>Токены нейросети GROK</h2>
        <p className={`${s.blockHint}${dk}`}>
          Расход токенов по нейросети GROK: в день и в месяц.
        </p>
        <div className={s.tokensWidgets}>
          <div className={`${s.tokenWidget}${dk}`}>
            <span className={s.tokenWidgetLabel}>В день</span>
            <span className={`${s.tokenWidgetValue}${dk}`}>
              {GROK_TOKENS_PER_DAY.toLocaleString('ru-RU')}
            </span>
            <span className={`${s.tokenWidgetUnit}${dk}`}>токенов</span>
          </div>
          <div className={`${s.tokenWidget}${dk}`}>
            <span className={s.tokenWidgetLabel}>В месяц</span>
            <span className={`${s.tokenWidgetValue}${dk}`}>
              {GROK_TOKENS_PER_MONTH.toLocaleString('ru-RU')}
            </span>
            <span className={`${s.tokenWidgetUnit}${dk}`}>токенов</span>
          </div>
        </div>
      </div>

      {/* ═══ Состояние базы данных ═══ */}
      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''} ${s.dbBlock}`}>
        <h2 className={`${s.blockTitle} ${isDark ? s.blockTitleDark : ''}`}>Состояние базы данных</h2>
        <p className={`${s.blockHint}${dk}`}>
          Всего зарегистрированных аккаунтов, статус подключения и последние ошибки.
        </p>

        <div className={s.dbWidgets}>
          <div className={`${s.dbWidget}${dk}`}>
            <span className={s.dbWidgetLabel}>Зарегистрировано аккаунтов</span>
            <span className={`${s.dbWidgetValue}${dk}`}>
              {DB_TOTAL_ACCOUNTS.toLocaleString('ru-RU')}
            </span>
          </div>
          <div className={`${s.dbWidget}${dk}`}>
            <span className={s.dbWidgetLabel}>Статус БД</span>
            <span className={`${s.dbStatus} ${DB_STATUS === 'Работает' ? s.dbStatusOk : s.dbStatusError}`}>
              {DB_STATUS === 'Работает' ? '● Работает' : '● Ошибка'}
            </span>
          </div>
          <div className={`${s.dbWidget}${dk}`}>
            <span className={s.dbWidgetLabel}>Ошибки за последний час</span>
            <span className={`${s.dbWidgetValue}${dk}`}>
              {DB_ERRORS.length === 0 ? 'Нет' : DB_ERRORS.length}
            </span>
          </div>
        </div>

        {DB_ERRORS.length > 0 && (
          <div className={s.dbErrors}>
            <span className={s.dbErrorsTitle}>Последние ошибки</span>
            <ul className={`${s.dbErrorsList}${dk}`}>
              {DB_ERRORS.map((err) => (
                <li key={err} className={s.dbErrorsItem}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {DB_ERRORS.length === 0 && (
          <div className={`${s.dbNoErrors}${dk}`}>
            <span className={s.dbNoErrorsIcon}>✓</span>
            <span>Ошибок нет. Подключение стабильно.</span>
          </div>
        )}
      </div>

      {/* ═══ DDoS-атаки ═══ */}
      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''} ${s.ddosBlock}`}>
        <h2 className={`${s.blockTitle} ${isDark ? s.blockTitleDark : ''}`}>DDoS-атаки</h2>
        <p className={`${s.blockHint}${dk}`}>
          Были ли атаки за выбранный период, причина и решение по каждому инциденту.
        </p>

        <div className={s.ddosStatusRow}>
          <span className={s.ddosStatusLabel}>Статус за последние 7 дней</span>
          <span
            className={
              DDOS_INCIDENTS.length === 0
                ? `${s.ddosBadge} ${s.ddosBadgeOk}`
                : `${s.ddosBadge} ${s.ddosBadgeAlert}`
            }
          >
            {DDOS_INCIDENTS.length === 0 ? 'Не было' : `Было: ${DDOS_INCIDENTS.length}`}
          </span>
        </div>

        {DDOS_INCIDENTS.length === 0 ? (
          <div className={`${s.ddosNoAttacks}${dk}`}>
            <span className={s.ddosNoAttacksIcon}>🛡</span>
            <span>DDoS-атак не зафиксировано. Трафик в норме.</span>
          </div>
        ) : (
          <div className={s.ddosList}>
            {DDOS_INCIDENTS.map((inc) => (
              <div key={inc.id} className={`${s.ddosCard}${dk}`}>
                <div className={s.ddosCardHead}>
                  <span className={`${s.ddosCardDate}${dk}`}>{inc.date}</span>
                  <span className={`${s.ddosCardTime}${dk}`}>{inc.time}</span>
                </div>
                <div className={s.ddosCardSection}>
                  <span className={s.ddosCardLabel}>Почему так случилось</span>
                  <p className={`${s.ddosCardText}${dk}`}>{inc.reason}</p>
                </div>
                <div className={s.ddosCardSection}>
                  <span className={s.ddosCardLabel}>Решение</span>
                  <p className={`${s.ddosCardText} ${s.ddosCardResolution}${dk}`}>{inc.resolution}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
