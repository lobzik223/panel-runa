import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './Section.module.css';
import s from './ServerPage.module.css';
import {
  fetchSystemMetrics,
  fetchSecurityAccessLog,
  fetchBlockedPanelIps,
  postBlockPanelIp,
  deleteBlockPanelIp,
  getAdminRole,
  type SystemMetricsDto,
  type PanelAccessLogEntryDto,
} from '@/lib/adminApi';

function formatBytes(n: number): string {
  if (n < 1024) return `${Math.round(n)} Б`;
  const gb = n / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} ГБ`;
  const mb = n / (1024 * 1024);
  return `${mb.toFixed(1)} МБ`;
}

function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d} д ${h} ч`;
  if (h > 0) return `${h} ч ${m} м`;
  return `${m} м`;
}

function storageStatus(percent: number): string {
  if (percent >= 90) return 'Критично';
  if (percent >= 70) return 'Внимание';
  return 'Норма';
}

function kindLabelRu(kind: string): string {
  switch (kind) {
    case 'login_fail':
      return 'Вход (ошибка)';
    case 'login_ok':
      return 'Вход';
    case 'blocked_ip':
      return 'Блок IP';
    case 'region_denied':
      return 'Регион/VPN';
    default:
      return 'API';
  }
}

const POLL_MS = 30_000;

export function ServerPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const dk = isDark ? ' ' + s.dk : '';
  const isSuper = (getAdminRole() || '').toLowerCase() === 'superadmin';

  const [metrics, setMetrics] = useState<SystemMetricsDto | null>(null);
  const [metricsErr, setMetricsErr] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<PanelAccessLogEntryDto[]>([]);
  const [blockedIps, setBlockedIps] = useState<string[]>([]);
  const [blockInput, setBlockInput] = useState('');
  const [blockBusy, setBlockBusy] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const m = await fetchSystemMetrics();
      setMetrics(m);
      setMetricsErr(null);
    } catch (e) {
      setMetricsErr(e instanceof Error ? e.message : String(e));
    }
    try {
      const log = await fetchSecurityAccessLog(50);
      setLogEntries(log.entries);
    } catch {
      /* ignore */
    }
    if (isSuper) {
      const bl = await fetchBlockedPanelIps();
      if (bl?.ips) setBlockedIps(bl.ips);
    }
  }, [isSuper]);

  useEffect(() => {
    void loadAll();
    const id = globalThis.setInterval(() => void loadAll(), POLL_MS);
    return () => globalThis.clearInterval(id);
  }, [loadAll]);

  const handleBlock = async () => {
    const ip = blockInput.trim();
    if (!ip) return;
    setBlockBusy(true);
    try {
      const r = await postBlockPanelIp(ip);
      setBlockedIps(r.blocked);
      setBlockInput('');
      void loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBlockBusy(false);
    }
  };

  const handleUnblock = async (ip: string) => {
    setBlockBusy(true);
    try {
      const r = await deleteBlockPanelIp(ip);
      setBlockedIps(r.blocked);
      void loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBlockBusy(false);
    }
  };

  const disk = metrics?.disk;
  const sysMem = metrics?.system.memory;
  const usedPercent =
    disk?.usedPercent != null
      ? Math.round(disk.usedPercent * 10) / 10
      : sysMem?.usedPercent != null
        ? Math.round(sysMem.usedPercent * 10) / 10
        : 0;
  const status = storageStatus(usedPercent);
  let statusClass = s.statusOk;
  if (status === 'Критично') statusClass = s.statusCritical;
  else if (status === 'Внимание') statusClass = s.statusWarning;

  const hourly = metrics?.adminApi.requestsByHourToday ?? new Array(24).fill(0);
  const trafficMax = Math.max(...hourly, 1);
  const hourlySum = metrics?.adminApi.requestsTodayApprox ?? hourly.reduce((a, b) => a + b, 0);

  const load1 = metrics?.system.load1 ?? 0;
  const stabilityApprox = Math.min(99.9, Math.max(75, 100 - Math.min(25, load1 * 5)));

  const ddosIncidents = metrics?.ddos.incidentsLast7Days ?? [];

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Серверная часть</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Реальные метрики процесса и ОС, БД и нагрузка на админ-API. Обновление каждые ~30 секунд.
      </p>

      {metricsErr ? (
        <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`} style={{ color: '#dc2626' }}>
          {metricsErr}
        </p>
      ) : null}

      <div className={styles.cards}>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>
              {disk ? 'Диск (корень процесса)' : 'Память ОС'}
            </span>
            <span className={`${s.statusBadge} ${statusClass}`}>{status}</span>
          </div>
          <div className={styles.cardValue}>
            {metrics && disk?.totalBytes != null && disk?.freeBytes != null ? (
              <>
                {formatBytes(disk.totalBytes - disk.freeBytes)} / {formatBytes(disk.totalBytes)}
              </>
            ) : metrics && sysMem ? (
              <>
                {formatBytes(sysMem.usedBytes)} / {formatBytes(sysMem.totalBytes)}
              </>
            ) : (
              '—'
            )}
          </div>
          <div className={s.storageBarWrap}>
            <div className={`${s.storageBarTrack}${dk}`}>
              <div className={s.storageBarFill} style={{ width: `${Math.min(100, usedPercent)}%` }} />
            </div>
            <span className={`${s.storageBarLabel}${dk}`}>Заполнено {usedPercent}%</span>
          </div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>
            {disk?.path ? `Путь: ${disk.path}. ` : ''}
            Node {metrics?.process.nodeVersion ?? '—'}, PID {metrics?.process.pid ?? '—'}
          </div>
        </div>

        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Стабильность</span>
            <span className={styles.cardBadgeGreen}>Нагрузка</span>
          </div>
          <div className={styles.cardValue}>{stabilityApprox.toFixed(1)}%</div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>
            Оценка по load average (1 мин): {load1.toFixed(2)} · Uptime процесса:{' '}
            {metrics ? formatUptime(metrics.process.uptimeSec) : '—'}
          </div>
        </div>

        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>
              Запросы к админ-API (сегодня)
            </span>
            <span className={styles.cardBadge}>Почасово</span>
          </div>
          <div className={styles.cardValue}>{hourlySum}</div>
          <div className={`${styles.cardHint} ${isDark ? styles.cardHintDark : ''}`}>
            Счётчик успешных запросов с авторизацией к /admin (локальное время сервера).
          </div>
        </div>
      </div>

      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''} ${s.trafficBlock}`}>
        <h2 className={`${s.blockTitle} ${isDark ? s.blockTitleDark : ''}`}>Нагрузка на админ-API по часам</h2>
        <p className={`${s.blockHint}${dk}`}>Ось X — часы 0–23, ось Y — число запросов за час.</p>
        <div className={`${s.chartArea}${dk}`}>
          <div className={s.chartBars}>
            {hourly.map((value, hour) => (
              <div
                key={`hour-${hour}`}
                className={s.chartBar}
                style={{
                  height: `${trafficMax > 0 ? (value / trafficMax) * 100 : 0}%`,
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

      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''} ${s.tokensBlock}`}>
        <h2 className={`${s.blockTitle} ${isDark ? s.blockTitleDark : ''}`}>Нейросеть (Grok / xAI)</h2>
        <p className={`${s.blockHint}${dk}`}>
          Ключ на сервере (без отображения секрета). Для учёта токенов используйте биллинг провайдера.
        </p>
        <div className={s.tokensWidgets}>
          <div className={`${s.tokenWidget}${dk}`}>
            <span className={s.tokenWidgetLabel}>Статус</span>
            <span className={`${s.tokenWidgetValue}${dk}`}>
              {metrics?.grok.configured ? 'Настроено' : 'Не задан'}
            </span>
            <span className={`${s.tokenWidgetUnit}${dk}`}>ключ API</span>
          </div>
          <div className={`${s.tokenWidget}${dk}`}>
            <span className={s.tokenWidgetLabel}>Подсказка</span>
            <span className={`${s.tokenWidgetValue}${dk}`} style={{ fontSize: 14 }}>
              {metrics?.grok.keyHint ?? '—'}
            </span>
            <span className={`${s.tokenWidgetUnit}${dk}`}>лог</span>
          </div>
        </div>
      </div>

      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''} ${s.dbBlock}`}>
        <h2 className={`${s.blockTitle} ${isDark ? s.blockTitleDark : ''}`}>Состояние базы данных</h2>
        <p className={`${s.blockHint}${dk}`}>Аккаунты приложения и админов панели.</p>

        <div className={s.dbWidgets}>
          <div className={`${s.dbWidget}${dk}`}>
            <span className={s.dbWidgetLabel}>Пользователей (users)</span>
            <span className={`${s.dbWidgetValue}${dk}`}>
              {(metrics?.database.usersTotal ?? 0).toLocaleString('ru-RU')}
            </span>
          </div>
          <div className={`${s.dbWidget}${dk}`}>
            <span className={s.dbWidgetLabel}>Статус БД</span>
            <span
              className={`${s.dbStatus} ${
                !metrics ? '' : metrics.database.ok ? s.dbStatusOk : s.dbStatusError
              }`}
            >
              {!metrics ? '—' : metrics.database.ok ? '● Работает' : '● Ошибка'}
            </span>
          </div>
          <div className={`${s.dbWidget}${dk}`}>
            <span className={s.dbWidgetLabel}>Аккаунтов панели</span>
            <span className={`${s.dbWidgetValue}${dk}`}>
              {(metrics?.database.panelAdmins ?? 0).toLocaleString('ru-RU')}
            </span>
          </div>
        </div>

        <div className={`${s.dbNoErrors}${dk}`}>
          <span className={s.dbNoErrorsIcon}>✓</span>
          <span>Heap Node: {metrics ? formatBytes(metrics.memory.heapUsed) : '—'} / {metrics ? formatBytes(metrics.memory.heapTotal) : '—'}</span>
        </div>
      </div>

      <div
        className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''} ${s.securityBlock}${isDark ? ' ' + s.dk : ''}`}
      >
        <h2 className={`${s.blockTitle} ${isDark ? s.blockTitleDark : ''}`}>Безопасность панели</h2>
        <p className={`${s.blockHint}${dk}`}>
          Попытки входа, отказы по региону (если заданы страны и Cloudflare), обращения к API. Показываются не более 50
          последних записей. Список в памяти процесса (после перезапуска бэкенда очищается; для
          постоянного аудита подключите логи nginx/Cloudflare).
        </p>
        {isSuper ? (
          <div className={s.blockRow}>
            <input
              type="text"
              className={s.blockInput}
              placeholder="IP для блокировки"
              value={blockInput}
              onChange={(e) => setBlockInput(e.target.value)}
              disabled={blockBusy}
            />
            <button type="button" className={s.blockBtn} onClick={() => void handleBlock()} disabled={blockBusy}>
              Заблокировать
            </button>
          </div>
        ) : (
          <p className={`${s.blockHint}${dk}`}>Управление блокировкой IP — только у главного администратора.</p>
        )}
        {isSuper && blockedIps.length > 0 ? (
          <ul className={s.blockList}>
            {blockedIps.map((ip) => (
              <li key={ip} className={s.blockListItem}>
                <code>{ip}</code>
                <button type="button" className={s.blockBtnSmall} onClick={() => void handleUnblock(ip)} disabled={blockBusy}>
                  Снять
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className={s.logTableWrap}>
          <table className={s.logTable}>
            <thead>
              <tr>
                <th>Время</th>
                <th>Тип</th>
                <th>IP</th>
                <th>Путь</th>
                <th>Код</th>
              </tr>
            </thead>
            <tbody>
              {logEntries.map((row, i) => (
                <tr key={`${row.ts}-${i}`}>
                  <td className={s.logTdMuted}>{new Date(row.ts).toLocaleString('ru-RU')}</td>
                  <td>{kindLabelRu(row.kind)}</td>
                  <td>
                    <code>{row.ip}</code>
                  </td>
                  <td className={s.logTdPath}>{row.path}</td>
                  <td>{row.statusCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logEntries.length === 0 ? <p className={`${s.blockHint}${dk}`}>Пока нет записей.</p> : null}
      </div>

      <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''} ${s.ddosBlock}`}>
        <h2 className={`${s.blockTitle} ${isDark ? s.blockTitleDark : ''}`}>DDoS и периметр</h2>
        <p className={`${s.blockHint}${dk}`}>{metrics?.ddos.notes ?? ''}</p>

        <div className={s.ddosStatusRow}>
          <span className={s.ddosStatusLabel}>Инциденты (файл на сервере)</span>
          <span
            className={
              ddosIncidents.length === 0 ? `${s.ddosBadge} ${s.ddosBadgeOk}` : `${s.ddosBadge} ${s.ddosBadgeAlert}`
            }
          >
            {ddosIncidents.length === 0 ? 'Нет в JSON' : `Записей: ${ddosIncidents.length}`}
          </span>
        </div>

        {ddosIncidents.length === 0 ? (
          <div className={`${s.ddosNoAttacks}${dk}`}>
            <span className={s.ddosNoAttacksIcon}>🛡</span>
            <span>
              Файл инцидентов не задан или пуст. Задайте переменную{' '}
              <code style={{ fontSize: 12 }}>ADMIN_PANEL_DDOS_INCIDENTS_JSON</code> на путь к JSON на сервере.
            </span>
          </div>
        ) : (
          <div className={s.ddosList}>
            {ddosIncidents.map((inc) => (
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
