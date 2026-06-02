import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import styles from '../Section.module.css';
import fc from './Finance.module.css';
import { FinancePeriodToolbar } from './FinancePeriodToolbar';
import {
  fetchPaymentSettings,
  fetchPaymentStats,
  fetchPayments,
  formatRub,
  updatePaymentHiddenTiers,
  type FinancePeriod,
  type FinanceTierBreakdownItem,
} from '@/lib/financeApi';
import { formatIntRu, formatPercentOneDecimal } from '@/lib/adminApi';

const SOURCE_HINT: Record<string, string> = {
  yookassa: 'ЮKassa',
  apple_store: 'App Store',
  google_play: 'Google Play',
  panel_grant: 'Выдача с панели',
};

export function FinancePaymentsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { canManageUsers } = useAdminRole();
  const [period, setPeriod] = useState<FinancePeriod>('month');
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchPaymentStats>> | null>(null);
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof fetchPayments>> | null>(null);
  const [hiddenTiers, setHiddenTiers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settings, s, p] = await Promise.all([
        fetchPaymentSettings().catch(() => ({ hiddenTiers: [] as string[] })),
        fetchPaymentStats(period),
        fetchPayments({ period, limit: pageSize, offset: page * pageSize }),
      ]);
      setHiddenTiers(settings.hiddenTiers);
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

  const hideTier = async (tier: string) => {
    if (!canManageUsers) return;
    const next = [...new Set([...hiddenTiers, tier.toLowerCase()])];
    const res = await updatePaymentHiddenTiers(next);
    setHiddenTiers(res.hiddenTiers);
    void load();
  };

  const totalPages = payments ? Math.max(1, Math.ceil(payments.total / pageSize)) : 1;
  const selected = stats?.selected;
  const byTier = selected?.byTier ?? [];

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Платежи</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Выручка и средний чек — только реальные оплаты: ЮKassa, App Store и Google Play. Выдачи тарифа из
        панели показаны отдельно: 0 ₽ с номиналом тарифа справа.
      </p>

      <FinancePeriodToolbar period={period} onChange={setPeriod} />

      {error ? (
        <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`} role="alert">
          {error}
        </p>
      ) : null}

      {!stats?.configured && !loading ? (
        <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
          YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY не заданы — список ЮKassa может быть пустым; магазины и выдачи с
          панели по-прежнему отображаются.
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
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Оплат (период)</span>
          </div>
          <div className={styles.cardValue}>
            {loading ? '…' : formatIntRu(selected?.paymentCount ?? 0)}
          </div>
          <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`} style={{ marginTop: 8, fontSize: 12 }}>
            ЮKassa {selected?.bySource.yookassa ?? 0} · App Store {selected?.bySource.apple_store ?? 0} · Google Play{' '}
            {selected?.bySource.google_play ?? 0}
          </p>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Средний чек</span>
          </div>
          <div className={styles.cardValue}>{loading ? '…' : formatRub(selected?.averageCheckRub ?? 0)}</div>
        </div>
        <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.cardTitle} ${isDark ? styles.cardTitleDark : ''}`}>Выдачи с панели</span>
          </div>
          <div className={styles.cardValue}>
            {loading ? '…' : formatIntRu(selected?.panelGrantCount ?? 0)}
          </div>
        </div>
      </div>

      {byTier.length > 0 ? (
        <div className={`${styles.contentBlock} ${isDark ? styles.contentBlockDark : ''}`} style={{ marginBottom: 24 }}>
          <h2 className={`${styles.title} ${isDark ? styles.titleDark : ''}`} style={{ fontSize: 16 }}>
            По тарифам (% от оплат и доля выручки)
          </h2>
          {canManageUsers ? (
            <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`} style={{ fontSize: 12, marginBottom: 12 }}>
              Скрыть лишнюю строку в сводке — кнопка «×» (только администратор).
            </p>
          ) : null}
          <div className={fc.tierGrid}>
            {byTier.map((item) => (
              <TierChip
                key={item.tier}
                item={item}
                isDark={isDark}
                canHide={canManageUsers}
                onHide={() => void hideTier(item.tier)}
              />
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
              <th>Источник</th>
              <th>Тариф</th>
              <th>Оплачено</th>
              <th>Номинал</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {loading && !payments?.payments.length ? (
              <tr>
                <td colSpan={7}>Загрузка…</td>
              </tr>
            ) : payments?.payments.length ? (
              payments.payments.map((p) => (
                <tr key={p.paymentId}>
                  <td>{new Date(p.createdAt).toLocaleString('ru-RU')}</td>
                  <td>{p.email || p.userId?.slice(0, 8) || '—'}</td>
                  <td>{p.sourceLabelRu || SOURCE_HINT[p.source] || p.source}</td>
                  <td>{p.planName || p.tier || '—'}</td>
                  <td className={p.source === 'panel_grant' ? fc.amountZero : undefined}>
                    {formatRub(p.amountRub)}
                  </td>
                  <td>
                    {p.catalogAmountRub != null && p.catalogAmountRub > 0
                      ? formatRub(p.catalogAmountRub)
                      : p.countsTowardRevenue
                        ? '—'
                        : '—'}
                  </td>
                  <td>{p.statusLabelRu || p.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>Нет операций за период</td>
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

function TierChip({
  item,
  isDark,
  canHide,
  onHide,
}: {
  item: FinanceTierBreakdownItem;
  isDark: boolean;
  canHide: boolean;
  onHide: () => void;
}) {
  return (
    <div className={`${fc.tierChip} ${isDark ? fc.tierChipDark : ''}`}>
      <div className={fc.tierChipHead}>
        <div style={{ fontWeight: 600 }}>{item.label}</div>
        {canHide && item.tier !== 'panel_grant' ? (
          <button type="button" className={fc.tierHideBtn} onClick={onHide} title="Скрыть из сводки">
            ×
          </button>
        ) : null}
      </div>
      <div style={{ fontSize: 22, marginTop: 4 }}>{item.count}</div>
      <div className={fc.tierChipMeta}>
        {formatPercentOneDecimal(item.percentCount)}% оплат
        {item.tier !== 'panel_grant' ? (
          <>
            {' '}
            · {formatRub(item.revenueRub)} ({formatPercentOneDecimal(item.percentRevenue)}% выручки)
          </>
        ) : (
          <> · не в выручке</>
        )}
      </div>
    </div>
  );
}
