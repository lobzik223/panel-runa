import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSearch } from '@/components/Icons';
import styles from './Section.module.css';
import s from './UsersPage.module.css';
import {
  type AdminUserDto,
  type AdminEntitlementDto,
  type AdminYookassaSitePaymentDto,
  fetchAdminUsers,
  fetchAdminUserDetail,
  patchAdminUser,
  postAppReviewExpiredDemo,
  postClearUserDeviceBindings,
} from '@/lib/adminApi';
import { fetchUserFinanceSummary, formatRub, formatUsagePair } from '@/lib/financeApi';
import fc from './finance/Finance.module.css';
import { useAdminRole } from '@/hooks/useAdminRole';

const PLAN_OPTIONS: { value: 'free' | 'lite' | 'pro' | 'business'; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: 'lite', label: 'Lite' },
  { value: 'pro', label: 'Pro' },
  { value: 'business', label: 'Business' },
];

const BAN_REASONS = [
  'Спам и массовая рассылка',
  'Нарушение правил использования',
  'Мошенничество / подозрительная активность',
  'Множественные аккаунты',
  'Оскорбительное поведение',
  'Генерация запрещённого контента',
  'Другое (указать вручную)',
];

function formatDateRu(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

function formatDateTimeRu(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function tierLabel(t: string): string {
  const x = (t || 'free').toLowerCase();
  const m: Record<string, string> = { free: 'Free', lite: 'Lite', pro: 'Pro', business: 'Business', life: 'Lite' };
  return m[x] || t;
}

type UserStatus = 'Активен' | 'Заблокирован' | 'Заморожен';

/** Приоритет: заморожен (soft-delete, будет стёрт) > заблокирован (квоты) > активен. */
function statusFromUser(u: AdminUserDto): UserStatus {
  if (u.deletedAt && (u.frozenDaysLeft ?? 0) > 0) return 'Заморожен';
  if (u.freeQuotaSuspended) return 'Заблокирован';
  return 'Активен';
}

function formatFrozenHint(u: AdminUserDto): string | null {
  if (!u.deletedAt) return null;
  const days = u.frozenDaysLeft ?? 0;
  if (days <= 0) return 'Срок восстановления истёк — будет удалён ближайшим прогоном очистки.';
  return `Заморожен до ${formatDateTimeRu(u.restorableUntil)} · осталось ${days} дн. · кол-во удалений: ${u.deletionCount}`;
}

function roleFromUser(u: AdminUserDto): string {
  return u.referredByUserId ? 'Реферал' : 'Пользователь';
}

function deviceLabel(platform: string | null): string {
  if (!platform) return '—';
  if (platform.toLowerCase() === 'ios') return 'iOS (приложение)';
  if (platform.toLowerCase() === 'android') return 'Android (приложение)';
  return platform;
}

function reviewExemptActive(u: AdminUserDto): boolean {
  const raw = u.storeReviewExemptUntil;
  if (!raw) return false;
  return new Date(raw).getTime() > Date.now();
}

function normalizePlanPick(t: string): 'free' | 'lite' | 'pro' | 'business' {
  const x = (t || 'free').toLowerCase();
  if (x === 'lite' || x === 'life') return 'lite';
  if (x === 'pro' || x === 'pro_monthly') return 'pro';
  if (x === 'business' || x === 'business_monthly') return 'business';
  return 'free';
}

export function UsersPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const dk = isDark ? ' ' + s.dk : '';
  const { canManageUsers } = useAdminRole();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [list, setList] = useState<AdminUserDto[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  /** Страница списка: 0-based. API: limit до 100. */
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUserDto | null>(null);
  const [entitlements, setEntitlements] = useState<AdminEntitlementDto[]>([]);
  const [yookassaSitePayments, setYookassaSitePayments] = useState<AdminYookassaSitePaymentDto[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'info' | 'purchases' | 'finance' | 'actions'>('info');
  const [financeSummary, setFinanceSummary] = useState<Awaited<ReturnType<typeof fetchUserFinanceSummary>> | null>(null);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState(BAN_REASONS[0]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'lite' | 'pro' | 'business'>('free');
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedQ, pageSize]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    const offset = pageIndex * pageSize;
    try {
      const r = await fetchAdminUsers({ q: debouncedQ, limit: pageSize, offset });
      setList(r.users);
      setTotal(r.total);
    } catch (e) {
      setList([]);
      setTotal(0);
      setListError((e as Error).message);
    } finally {
      setListLoading(false);
    }
  }, [debouncedQ, pageIndex, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (listLoading || total < 0) return;
    if (total === 0 && pageIndex !== 0) {
      setPageIndex(0);
      return;
    }
    const maxIdx = Math.max(0, Math.ceil(total / pageSize) - 1);
    if (pageIndex > maxIdx) setPageIndex(maxIdx);
  }, [listLoading, total, pageSize, pageIndex]);

  const openUser = async (u: AdminUserDto) => {
    setSelectedId(u.id);
    setDetailUser(u);
    setEntitlements([]);
    setYookassaSitePayments([]);
    setActiveTab('info');
    setFinanceSummary(null);
    setFinanceError(null);
    setDetailError(null);
    setActionError(null);
    setSelectedPlan(normalizePlanPick(u.subscriptionTier));
    setDetailLoading(true);
    try {
      const r = await fetchAdminUserDetail(u.id);
      setDetailUser(r.user);
      setEntitlements(r.entitlements);
      setYookassaSitePayments(r.yookassaSitePayments);
      setSelectedPlan(normalizePlanPick(r.user.subscriptionTier));
    } catch (e) {
      setDetailError((e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'finance' || !selectedId) return;
    let cancelled = false;
    setFinanceLoading(true);
    setFinanceError(null);
    void (async () => {
      try {
        const data = await fetchUserFinanceSummary(selectedId, 'month');
        if (!cancelled) setFinanceSummary(data);
      } catch (e) {
        if (!cancelled) {
          setFinanceSummary(null);
          setFinanceError((e as Error).message);
        }
      } finally {
        if (!cancelled) setFinanceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedId]);

  const closeUser = () => {
    setSelectedId(null);
    setDetailUser(null);
    setEntitlements([]);
    setYookassaSitePayments([]);
    setFinanceSummary(null);
    setFinanceError(null);
    setShowBanModal(false);
    setShowPlanModal(false);
    setDetailError(null);
    setActionError(null);
  };

  const refreshDetailAfterAction = async (userId: string) => {
    const r = await fetchAdminUserDetail(userId);
    setDetailUser(r.user);
    setEntitlements(r.entitlements);
    setYookassaSitePayments(r.yookassaSitePayments);
    await loadList();
  };

  const statusClass = (st: string) => {
    if (st === 'Активен') return s.badgeGreen;
    if (st === 'Заблокирован') return s.badgeRed;
    if (st === 'Заморожен') return s.badgeRed;
    return s.badgeGray;
  };

  const purchaseStatusClass = (expired: boolean) => (expired ? s.badgeGray : s.badgeGreen);
  const purchaseStatusLabel = (expired: boolean) => (expired ? 'Истекла' : 'Активна');

  const selectedUser = detailUser;

  const handleApplyPlan = async () => {
    if (!selectedId || !selectedUser) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await patchAdminUser(selectedId, {
        subscriptionTier: selectedPlan,
        ...(selectedPlan === 'free' ? { clearTrial: true } : {}),
      });
      setShowPlanModal(false);
      await refreshDetailAfterAction(selectedId);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleResetFree = async () => {
    if (!selectedId) return;
    if (!window.confirm('Сбросить тариф на Free и очистить триал?')) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await patchAdminUser(selectedId, { subscriptionTier: 'free', clearTrial: true });
      await refreshDetailAfterAction(selectedId);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleGrantStoreReviewExempt = async (days: number) => {
    if (!selectedId) return;
    const until = new Date();
    until.setUTCDate(until.getUTCDate() + days);
    setActionBusy(true);
    setActionError(null);
    try {
      await patchAdminUser(selectedId, { storeReviewExemptUntil: until.toISOString() });
      await refreshDetailAfterAction(selectedId);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleClearStoreReviewExempt = async () => {
    if (!selectedId) return;
    if (!window.confirm('Снять льготу ревью стора? Квоты снова станут обычными для текущего тарифа.')) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await patchAdminUser(selectedId, { storeReviewExemptUntil: null });
      await refreshDetailAfterAction(selectedId);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleAppReviewExpiredDemo = async () => {
    if (!selectedId) return;
    if (
      !window.confirm(
        'Только для проверки экрана покупки: в БД будет Lite с оплатой и триалом в прошлом — в приложении появится «тариф завершён» и призыв к подписке. Льгота ревью при этом сбросится. Для обычного прохода ревьюера используйте «Льгота ревью стора (продление)». Продолжить?',
      )
    ) {
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      const r = await postAppReviewExpiredDemo(selectedId);
      setDetailUser(r.user);
      setEntitlements(r.entitlements);
      setYookassaSitePayments(r.yookassaSitePayments);
      await loadList();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleBan = async () => {
    if (!selectedId) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await patchAdminUser(selectedId, { freeQuotaSuspended: true, blockReason: banReason });
      setShowBanModal(false);
      await refreshDetailAfterAction(selectedId);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleUnban = async () => {
    if (!selectedId) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await patchAdminUser(selectedId, { freeQuotaSuspended: false });
      await refreshDetailAfterAction(selectedId);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  };

  const q = searchQuery.trim().toLowerCase();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(pageIndex, Math.max(0, totalPages - 1));
  const fromIdx = total === 0 ? 0 : safePage * pageSize + 1;
  const toIdx = total === 0 ? 0 : Math.min(total, safePage * pageSize + list.length);

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Пользователи</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Список с разбивкой по страницам: выберите, сколько строк показывать, и листайте вперёд/назад. Строка — открыть карточку пользователя.
      </p>

      {listError ? (
        <p className={`${s.inlineError}${dk}`} role="alert">
          {listError}
        </p>
      ) : null}

      <div className={`${s.searchWrap}${dk}`}>
        <IconSearch className={s.searchIcon} />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по имени, email, UUID..."
          className={`${s.searchInput}${dk}`}
        />
        <span className={`${s.searchCount}${dk}`}>
          {listLoading ? '…' : `В базе: ${total.toLocaleString('ru-RU')}`}
        </span>
      </div>

      <div className={`${s.listToolbar}${dk}`}>
        <div className={s.listToolbarLeft}>
          <span className={`${s.rangeText}${dk}`}>
            {listLoading ? 'Загрузка…' : `Показано ${fromIdx.toLocaleString('ru-RU')}–${toIdx.toLocaleString('ru-RU')} из ${total.toLocaleString('ru-RU')}`}
          </span>
          {total > 0 && !listLoading ? (
            <span className={`${s.pageHint}${dk}`}>
              Стр. {safePage + 1} / {totalPages}
            </span>
          ) : null}
        </div>
        <div className={s.listToolbarRight}>
          <label className={`${s.pageSizeLabel}${dk}`}>
            <span className={s.pageSizeLabelText}>На странице</span>
            <select
              className={`${s.pageSizeSelect}${dk}`}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              disabled={listLoading}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <div className={s.pageNav}>
            <button
              type="button"
              className={`${s.pageBtn}${dk}`}
              disabled={listLoading || safePage <= 0}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            >
              Назад
            </button>
            <button
              type="button"
              className={`${s.pageBtn}${dk}`}
              disabled={listLoading || safePage >= totalPages - 1 || total === 0}
              onClick={() => setPageIndex((p) => p + 1)}
            >
              Вперёд
            </button>
          </div>
        </div>
      </div>

      <div className={`${styles.tableWrap} ${isDark ? styles.tableWrapDark : ''}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Пользователь</th>
              <th>Тариф</th>
              <th>Платформа</th>
              <th>Дата рег.</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {listLoading && list.length === 0 ? (
              <tr>
                <td colSpan={7} className={s.emptyCell}>
                  Загрузка…
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={7} className={s.emptyCell}>
                  {q ? 'Никого не найдено.' : 'Нет пользователей в базе.'}
                </td>
              </tr>
            ) : (
              list.map((u) => {
                const st = statusFromUser(u);
                const shortId = u.id.slice(0, 8);
                return (
                  <tr key={u.id} className={s.userRow} onClick={() => void openUser(u)}>
                    <td>
                      <span className={`${s.idChip}${dk}`} title={u.id}>
                        {shortId}…
                      </span>
                    </td>
                    <td>
                      <div className={s.userCell}>
                        <div className={`${s.avatarSmall}${dk}`}>
                          <span>{(u.name || u.email || '?')[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <div className={`${s.userName}${dk}`}>{u.name || '—'}</div>
                          <div className={`${s.userEmail}${dk}`}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`${s.planChip}${dk}`}>{tierLabel(u.subscriptionTier)}</span>
                    </td>
                    <td>
                      <span className={`${s.deviceText}${dk}`}>{deviceLabel(u.devicePlatform)}</span>
                    </td>
                    <td>{formatDateRu(u.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span className={`${s.badge} ${statusClass(st)}`}>{st}</span>
                        {st === 'Заморожен' ? (
                          <span className={`${s.userEmail}${dk}`} style={{ fontSize: 11 }}>
                            ост. {u.frozenDaysLeft ?? 0} дн.
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span className={`${s.openArrow}${dk}`}>→</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <div className={s.overlay} onClick={closeUser}>
          <div className={`${s.modal}${dk}`} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div className={s.modalAvatar}>
                <span>{(selectedUser.name || selectedUser.email || '?')[0].toUpperCase()}</span>
              </div>
              <div className={s.modalHeaderInfo}>
                <h2 className={s.modalName}>{selectedUser.name || '—'}</h2>
                <span className={`${s.modalEmail}${dk}`}>{selectedUser.email}</span>
                <div className={s.modalMeta}>
                  <span className={`${s.badge} ${statusClass(statusFromUser(selectedUser))}`}>
                    {statusFromUser(selectedUser)}
                  </span>
                  <span className={`${s.onlineLabel}`}>Обновлён: {formatDateTimeRu(selectedUser.updatedAt)}</span>
                </div>
                {selectedUser.deletedAt ? (
                  <p className={`${s.inlineError}${dk}`} style={{ marginTop: 8 }}>
                    {formatFrozenHint(selectedUser)}
                  </p>
                ) : null}
              </div>
              <button type="button" className={`${s.closeBtn}${dk}`} onClick={closeUser}>
                ✕
              </button>
            </div>

            {detailError ? (
              <p className={`${s.inlineError}${dk}`}>{detailError}</p>
            ) : null}
            {actionError ? (
              <p className={`${s.inlineError}${dk}`}>{actionError}</p>
            ) : null}
            {detailLoading ? (
              <p className={`${s.purchasesHint}${dk}`}>Загрузка профиля…</p>
            ) : null}

            <div className={`${s.tabs}${dk}`}>
              <button
                type="button"
                className={`${s.tab} ${activeTab === 'info' ? s.tabActive : ''}${dk}`}
                onClick={() => setActiveTab('info')}
              >
                Профиль
              </button>
              <button
                type="button"
                className={`${s.tab} ${activeTab === 'purchases' ? s.tabActive : ''}${dk}`}
                onClick={() => setActiveTab('purchases')}
              >
                Покупки
              </button>
              <button
                type="button"
                className={`${s.tab} ${activeTab === 'finance' ? s.tabActive : ''}${dk}`}
                onClick={() => setActiveTab('finance')}
              >
                Финансы
              </button>
              {canManageUsers ? (
                <button
                  type="button"
                  className={`${s.tab} ${activeTab === 'actions' ? s.tabActive : ''}${dk}`}
                  onClick={() => setActiveTab('actions')}
                >
                  Действия
                </button>
              ) : null}
            </div>

            {activeTab === 'info' && selectedUser && (
              <div className={s.tabContent}>
                <div className={s.infoGrid}>
                  <InfoField label="ID пользователя" value={selectedUser.id} dk={dk} />
                  <InfoField label="Имя" value={selectedUser.name || '—'} dk={dk} />
                  <InfoField label="Email" value={selectedUser.email} dk={dk} />
                  <InfoField label="Роль" value={roleFromUser(selectedUser)} dk={dk} />
                  <InfoField label="Платформа устройства" value={deviceLabel(selectedUser.devicePlatform)} dk={dk} />
                  <InfoField
                    label="Привязка к регистрации (хэш в БД)"
                    value={String(selectedUser.deviceBindingCount ?? 0)}
                    dk={dk}
                  />
                  <InfoField label="Текущий тариф" value={tierLabel(selectedUser.subscriptionTier)} dk={dk} accent />
                  <InfoField label="Оплаченная подписка до" value={formatDateRu(selectedUser.paidSubscriptionExpiresAt)} dk={dk} />
                  <InfoField label="Триал" value={formatDateTimeRu(selectedUser.freeTrialExpiresAt)} dk={dk} />
                  <InfoField label="Реферал (id)" value={selectedUser.referredByUserId || '—'} dk={dk} />
                  <InfoField label="Дата регистрации" value={formatDateRu(selectedUser.createdAt)} dk={dk} />
                  <InfoField label="Квоты заблокированы" value={selectedUser.freeQuotaSuspended ? 'Да' : 'Нет'} dk={dk} warn={selectedUser.freeQuotaSuspended} />
                  <InfoField
                    label="Льгота ревью стора (продление до)"
                    value={
                      selectedUser.storeReviewExemptUntil
                        ? `${formatDateTimeRu(selectedUser.storeReviewExemptUntil)}${reviewExemptActive(selectedUser) ? '' : ' (истекла)'}`
                        : '—'
                    }
                    dk={dk}
                    accent={reviewExemptActive(selectedUser)}
                  />
                  {selectedUser.freeQuotaSuspended ? (
                    <InfoField
                      label="Причина блокировки"
                      value={selectedUser.adminBlockReason?.trim() || '—'}
                      dk={dk}
                      warn
                    />
                  ) : null}
                </div>
                {canManageUsers ? (
                  <div className={`${s.deviceResetBlock}${dk}`}>
                    <p className={`${s.deviceResetText}${dk}`}>
                      Если приложение не даёт зарегистрировать новый аккаунт с этого устройства («уже зарегистрирован»), можно
                      сбросить привязку: в БД удаляются только HMAC-хэши устройства и таймер повторной отправки кода. Вход по
                      Google и Apple не сбрасывается (идентификаторы в аккаунте не трогаем).
                    </p>
                    <button
                      type="button"
                      className={`${s.actionBtn} ${s.actionBtnOrange}`}
                      disabled={actionBusy || (selectedUser.deviceBindingCount ?? 0) === 0}
                      onClick={() => {
                        if (
                          !window.confirm(
                            'Сбросить привязку устройства к этому аккаунту? С устройства снова можно будет создать другой аккаунт. Вход через Google/Apple для этого пользователя сохранится.',
                          )
                        ) {
                          return;
                        }
                        void (async () => {
                          if (!selectedId) return;
                          setActionBusy(true);
                          setActionError(null);
                          try {
                            const r = await postClearUserDeviceBindings(selectedId);
                            setDetailUser(r.user);
                            await loadList();
                          } catch (e) {
                            setActionError((e as Error).message);
                          } finally {
                            setActionBusy(false);
                          }
                        })();
                      }}
                    >
                      Сбросить привязку устройства
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {activeTab === 'purchases' && selectedUser && (
              <div className={s.tabContent}>
                {entitlements.length === 0 && yookassaSitePayments.length === 0 ? (
                  <p className={`${s.emptyMsg}${dk}`}>
                    Нет записей: ни подписок в магазинах, ни оплат на сайте (ЮKassa).
                  </p>
                ) : (
                  <>
                    <p className={`${s.purchasesHint}${dk}`}>App Store / Google Play · таблица store_entitlements</p>
                    {entitlements.length === 0 ? (
                      <p className={`${s.emptyMsg}${dk}`}>Нет записей о подписках в магазинах</p>
                    ) : (
                      <div className={s.purchasesList}>
                        {entitlements.map((p) => {
                          const expired = new Date(p.expiresAt).getTime() < Date.now();
                          return (
                            <div key={p.id} className={`${s.purchaseCard}${dk}`}>
                              <div className={s.purchaseLeft}>
                                <span className={`${s.purchasePlan}${dk}`}>{p.productId}</span>
                                <span className={`${s.purchaseDate}${dk}`}>
                                  {p.platform} · до {formatDateRu(p.expiresAt)}
                                </span>
                              </div>
                              <div className={s.purchaseRight}>
                                <span className={`${s.purchaseDate}${dk}`}>{formatDateRu(p.createdAt)}</span>
                                <span className={`${s.badge} ${purchaseStatusClass(expired)}`}>{purchaseStatusLabel(expired)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className={`${s.purchasesHint} ${s.purchasesBlockSpacer}${dk}`}>
                      Оплата на сайте (ЮKassa) · таблица yookassa_site_payment_applications — начисление тарифа после успешной
                      оплаты
                    </p>
                    {yookassaSitePayments.length === 0 ? (
                      <p className={`${s.emptyMsg}${dk}`}>Нет записей об оплатах через ЮKassa</p>
                    ) : (
                      <div className={s.purchasesList}>
                        {yookassaSitePayments.map((p) => (
                          <div key={p.paymentId} className={`${s.purchaseCard}${dk}`}>
                            <div className={s.purchaseLeft}>
                              <span className={`${s.purchasePlan}${dk}`}>{p.planName}</span>
                              <span className={`${s.purchaseDate}${dk}`}>
                                Тариф: {tierLabel(p.appliedTier)} · платёж {p.paymentId}
                              </span>
                            </div>
                            <div className={s.purchaseRight}>
                              <span className={`${s.purchaseDate}${dk}`}>Начислено: {formatDateTimeRu(p.appliedAt)}</span>
                              <span className={`${s.badge} ${s.badgeGreen}`}>ЮKassa</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'finance' && selectedUser && (
              <div className={s.tabContent}>
                {financeError ? (
                  <p className={`${fc.alertError} ${isDark ? fc.alertErrorDark : ''}`} role="alert">
                    {financeError}
                  </p>
                ) : null}
                {financeLoading ? (
                  <p className={`${s.purchasesHint}${dk}`}>Загрузка финансов…</p>
                ) : financeSummary ? (
                  <>
                    <div className={fc.financeSection}>
                      <h4 className={fc.financeSectionTitle}>Подписка и оплаты</h4>
                      {financeSummary.finance.totalSpentRub === 0 &&
                      financeSummary.finance.purchaseCount === 0 ? (
                        <p className={`${fc.financeHint} ${isDark ? fc.financeHintDark : ''}`}>
                          В базе нет записей об оплате (ЮKassa и магазины). Если тариф платный — возможно,
                          подписка выдана вручную. Подробности — на вкладке «Покупки».
                        </p>
                      ) : null}
                      <div className={fc.financeMetrics}>
                        <div className={`${fc.financeMetric} ${isDark ? fc.financeMetricDark : ''}`}>
                          <div className={fc.financeMetricLabel}>Текущий тариф</div>
                          <div
                            className={`${fc.financeMetricValue} ${fc.financeMetricValueAccent} ${isDark ? fc.financeMetricValueDark : ''}`}
                          >
                            {tierLabel(selectedUser.subscriptionTier)}
                          </div>
                        </div>
                        <div className={`${fc.financeMetric} ${isDark ? fc.financeMetricDark : ''}`}>
                          <div className={fc.financeMetricLabel}>Оплата до</div>
                          <div className={`${fc.financeMetricValue} ${isDark ? fc.financeMetricValueDark : ''}`}>
                            {formatDateRu(selectedUser.paidSubscriptionExpiresAt)}
                          </div>
                        </div>
                        <div className={`${fc.financeMetric} ${isDark ? fc.financeMetricDark : ''}`}>
                          <div className={fc.financeMetricLabel}>Всего потрачено</div>
                          <div
                            className={`${fc.financeMetricValue} ${fc.financeMetricValueAccent} ${isDark ? fc.financeMetricValueDark : ''}`}
                          >
                            {formatRub(financeSummary.finance.totalSpentRub)}
                          </div>
                        </div>
                        <div className={`${fc.financeMetric} ${isDark ? fc.financeMetricDark : ''}`}>
                          <div className={fc.financeMetricLabel}>Покупок</div>
                          <div className={`${fc.financeMetricValue} ${isDark ? fc.financeMetricValueDark : ''}`}>
                            {financeSummary.finance.purchaseCount}
                            <span className={fc.financeMetricSub}>
                              сайт {financeSummary.finance.sitePaymentsCount} · store{' '}
                              {financeSummary.finance.storePaymentsCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={fc.financeSection}>
                      <h4 className={fc.financeSectionTitle}>
                        Использование за период (лимит тарифа {tierLabel(financeSummary.usage.tier)})
                      </h4>
                      <div className={fc.financeMetrics}>
                        {(
                          [
                            ['Текст (токены)', financeSummary.usage.text],
                            ['Анализ фото', financeSummary.usage.image],
                            ['Презентации (слайды)', financeSummary.usage.slides],
                            ['PDF (документы)', financeSummary.usage.pdf],
                          ] as const
                        ).map(([label, u]) => (
                          <div key={label} className={`${fc.financeMetric} ${isDark ? fc.financeMetricDark : ''}`}>
                            <div className={fc.financeMetricLabel}>{label}</div>
                            <div className={`${fc.financeMetricValue} ${isDark ? fc.financeMetricValueDark : ''}`}>
                              {formatUsagePair(u, 'period')}
                            </div>
                            <div className={fc.financeMetricSub}>
                              всего: {formatUsagePair(u, 'allTime')}
                              {u.unit === 'count' ? ' шт.' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {financeSummary.finance.payments.length > 0 ? (
                      <div className={fc.financeSection}>
                        <h4 className={fc.financeSectionTitle}>История покупок</h4>
                        <div className={s.purchasesList}>
                          {financeSummary.finance.payments.map((p) => (
                            <div key={`${p.source}-${p.paymentId}`} className={`${s.purchaseCard}${dk}`}>
                              <div className={s.purchaseLeft}>
                                <span className={`${s.purchasePlan}${dk}`}>
                                  {p.planName}
                                  <span className={fc.paymentSource}>
                                    {' '}
                                    ·{' '}
                                    {p.source === 'yookassa'
                                      ? 'ЮKassa'
                                      : p.source === 'panel_grant'
                                        ? 'Панель (0 ₽)'
                                        : p.platform ?? 'Store'}
                                  </span>
                                </span>
                                <span className={`${s.purchaseDate}${dk}`}>
                                  {formatDateTimeRu(p.appliedAt)}
                                  {p.source === 'yookassa' ? ` · ${p.paymentId.slice(0, 14)}…` : ''}
                                </span>
                              </div>
                              <div className={`${s.purchaseRight} ${s.purchaseRightStack}`}>
                                <span className={`${s.purchasePrice}${dk}`}>
                                  {p.source === 'panel_grant' ? '0 ₽' : formatRub(p.amountRub)}
                                </span>
                                {p.source === 'panel_grant' && p.catalogAmountRub != null && p.catalogAmountRub > 0 ? (
                                  <span className={`${s.purchaseCatalog}${dk}`}>
                                    тариф {formatRub(p.catalogAmountRub)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : financeError ? null : (
                  <p className={`${s.emptyMsg}${dk}`}>Не удалось загрузить финансовые данные</p>
                )}
              </div>
            )}

            {activeTab === 'actions' && canManageUsers && selectedUser && (
              <div className={s.tabContent}>
                <div className={s.actionsGrid}>
                  <div className={`${s.actionCard}${dk}`}>
                    <h4 className={s.actionTitle}>Управление тарифом</h4>
                    <p className={`${s.actionDesc}${dk}`}>
                      Выдать тариф: для платных по умолчанию +30 дней оплаты в БД
                    </p>
                    <button
                      type="button"
                      className={`${s.actionBtn} ${s.actionBtnBlue}`}
                      disabled={actionBusy}
                      onClick={() => {
                        setSelectedPlan(normalizePlanPick(selectedUser.subscriptionTier));
                        setShowPlanModal(true);
                      }}
                    >
                      Изменить тариф
                    </button>
                  </div>

                  <div className={`${s.actionCard}${dk}`}>
                    <h4 className={s.actionTitle}>Сбросить на Free</h4>
                    <p className={`${s.actionDesc}${dk}`}>Тариф free, снять оплату и триал</p>
                    <button
                      type="button"
                      className={`${s.actionBtn} ${s.actionBtnOrange}`}
                      disabled={actionBusy}
                      onClick={() => void handleResetFree()}
                    >
                      Сбросить на Free
                    </button>
                  </div>

                  <div className={`${s.actionCard}${dk} ${s.actionCardWide}`}>
                    <h4 className={s.actionTitle}>Льгота ревью App Store / Google Play</h4>
                    <p className={`${s.actionDesc}${dk}`}>
                      Продлевает срок действия текущего триала или платной подписки пользователя до указанной даты.
                      Тариф и лимиты (слайды, PDF, токены, CV, хранилище) не меняются — ревьюер видит ровно то же
                      приложение, что обычный пользователь его тарифа, только с удлинённым сроком для проверки.
                      Например: Free-юзер с триалом на 5 дней + льгота 180 дней = триал действует ~180 дней. Не
                      путать с кнопкой «истёкшая подписка» ниже.
                    </p>
                    <p
                      className={`${s.actionDesc}${dk}`}
                      style={{
                        marginTop: 8,
                        fontWeight: 600,
                        color: reviewExemptActive(selectedUser) ? '#10b981' : undefined,
                      }}
                    >
                      {reviewExemptActive(selectedUser)
                        ? `Активна до ${formatDateTimeRu(selectedUser.storeReviewExemptUntil ?? null)}`
                        : selectedUser.storeReviewExemptUntil
                          ? `Истекла: ${formatDateTimeRu(selectedUser.storeReviewExemptUntil ?? null)}`
                          : 'Статус: не выдана'}
                    </p>
                    <div className={s.actionsRow}>
                      <button
                        type="button"
                        className={`${s.actionBtn} ${s.actionBtnGreen}`}
                        disabled={actionBusy}
                        onClick={() => void handleGrantStoreReviewExempt(90)}
                      >
                        Включить на 90 дней
                      </button>
                      <button
                        type="button"
                        className={`${s.actionBtn} ${s.actionBtnGreen}`}
                        disabled={actionBusy}
                        onClick={() => void handleGrantStoreReviewExempt(180)}
                      >
                        На 180 дней
                      </button>
                      <button
                        type="button"
                        className={`${s.actionBtn} ${s.actionBtnOrange}`}
                        disabled={actionBusy || !reviewExemptActive(selectedUser)}
                        onClick={() => void handleClearStoreReviewExempt()}
                      >
                        Снять льготу
                      </button>
                    </div>
                  </div>

                  <div className={`${s.actionCard}${dk}`}>
                    <h4 className={s.actionTitle}>Демо: истёкшая подписка (только тест IAP)</h4>
                    <p className={`${s.actionDesc}${dk}`}>
                      Специально ломает «активную» подписку в UI, чтобы проверить экран покупки. Для нормальной проверки
                      функций не использовать — вместо этого «Льгота ревью» или сброс на Free.
                    </p>
                    <button
                      type="button"
                      className={`${s.actionBtn} ${s.actionBtnBlue}`}
                      disabled={actionBusy}
                      onClick={() => void handleAppReviewExpiredDemo()}
                    >
                      Выставить «истёкшую» Lite
                    </button>
                  </div>

                  <div className={`${s.actionCard}${dk} ${s.actionCardWide}`}>
                    <h4 className={s.actionTitle}>Блокировка квот (free_quota_suspended)</h4>
                    <p className={`${s.actionDesc}${dk}`}>Жёстко обнуляет квоты для аккаунта (как в приложении)</p>
                    <button
                      type="button"
                      className={`${s.actionBtn} ${s.actionBtnRed}`}
                      disabled={actionBusy || selectedUser.freeQuotaSuspended}
                      onClick={() => setShowBanModal(true)}
                    >
                      {selectedUser.freeQuotaSuspended ? 'Уже заблокирован' : 'Заблокировать квоты'}
                    </button>
                  </div>

                  {selectedUser.freeQuotaSuspended && (
                    <div className={`${s.actionCard}${dk}`}>
                      <h4 className={s.actionTitle}>Снять блокировку квот</h4>
                      <p className={`${s.actionDesc}${dk}`}>Разрешить снова учитывать квоты</p>
                      <button
                        type="button"
                        className={`${s.actionBtn} ${s.actionBtnGreen}`}
                        disabled={actionBusy}
                        onClick={() => void handleUnban()}
                      >
                        Разблокировать
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showBanModal && (
        <div className={s.overlay} onClick={() => setShowBanModal(false)}>
          <div className={`${s.miniModal}${dk}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={s.miniModalTitle}>Блокировка квот</h3>
            <p className={`${s.miniModalDesc}${dk}`}>Причина (для ваших записей; в БД не сохраняется):</p>
            <div className={s.banReasons}>
              {BAN_REASONS.map((r) => (
                <label key={r} className={`${s.radioLabel}${dk}`}>
                  <input
                    type="radio"
                    name="ban"
                    checked={banReason === r}
                    onChange={() => setBanReason(r)}
                    className={s.radioInput}
                  />
                  <span className={`${s.radioText}${dk}`}>{r}</span>
                </label>
              ))}
            </div>
            <div className={s.miniModalActions}>
              <button type="button" className={`${s.actionBtn} ${s.actionBtnRed}`} disabled={actionBusy} onClick={() => void handleBan()}>
                Заблокировать
              </button>
              <button type="button" className={`${s.actionBtn} ${s.actionBtnGhost}${dk}`} onClick={() => setShowBanModal(false)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {showPlanModal && selectedUser && (
        <div className={s.overlay} onClick={() => setShowPlanModal(false)}>
          <div className={`${s.miniModal}${dk}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={s.miniModalTitle}>Изменить тариф</h3>
            <p className={`${s.miniModalDesc}${dk}`}>
              Сейчас: <strong>{tierLabel(selectedUser.subscriptionTier)}</strong>
            </p>
            <div className={s.planOptions}>
              {PLAN_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={`${s.planChipBtn} ${selectedPlan === p.value ? s.planChipBtnActive : ''}${dk}`}
                  onClick={() => setSelectedPlan(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className={s.miniModalActions}>
              <button type="button" className={`${s.actionBtn} ${s.actionBtnBlue}`} disabled={actionBusy} onClick={() => void handleApplyPlan()}>
                Применить
              </button>
              <button type="button" className={`${s.actionBtn} ${s.actionBtnGhost}${dk}`} onClick={() => setShowPlanModal(false)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function InfoField({
  label,
  value,
  dk,
  accent,
  warn,
}: {
  label: string;
  value: string;
  dk: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={`${s.infoField}${dk}`}>
      <span className={s.infoLabel}>{label}</span>
      <span className={`${s.infoValue} ${accent ? s.infoValueAccent : ''} ${warn ? s.infoValueWarn : ''}`}>{value}</span>
    </div>
  );
}

