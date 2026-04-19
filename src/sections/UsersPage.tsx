import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSearch } from '@/components/Icons';
import styles from './Section.module.css';
import s from './UsersPage.module.css';
import {
  type AdminUserDto,
  type AdminEntitlementDto,
  fetchAdminUsers,
  fetchAdminUserDetail,
  patchAdminUser,
  postAppReviewExpiredDemo,
  postClearUserDeviceBindings,
} from '@/lib/adminApi';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [list, setList] = useState<AdminUserDto[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUserDto | null>(null);
  const [entitlements, setEntitlements] = useState<AdminEntitlementDto[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'info' | 'purchases' | 'actions'>('info');
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState(BAN_REASONS[0]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'lite' | 'pro' | 'business'>('free');
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const r = await fetchAdminUsers({ q: debouncedQ, limit: 80, offset: 0 });
      setList(r.users);
      setTotal(r.total);
    } catch (e) {
      setList([]);
      setTotal(0);
      setListError((e as Error).message);
    } finally {
      setListLoading(false);
    }
  }, [debouncedQ]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openUser = async (u: AdminUserDto) => {
    setSelectedId(u.id);
    setDetailUser(u);
    setEntitlements([]);
    setActiveTab('info');
    setDetailError(null);
    setActionError(null);
    setSelectedPlan(normalizePlanPick(u.subscriptionTier));
    setDetailLoading(true);
    try {
      const r = await fetchAdminUserDetail(u.id);
      setDetailUser(r.user);
      setEntitlements(r.entitlements);
      setSelectedPlan(normalizePlanPick(r.user.subscriptionTier));
    } catch (e) {
      setDetailError((e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeUser = () => {
    setSelectedId(null);
    setDetailUser(null);
    setEntitlements([]);
    setShowBanModal(false);
    setShowPlanModal(false);
    setDetailError(null);
    setActionError(null);
  };

  const refreshDetailAfterAction = async (userId: string) => {
    const r = await fetchAdminUserDetail(userId);
    setDetailUser(r.user);
    setEntitlements(r.entitlements);
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

  const handleAppReviewExpiredDemo = async () => {
    if (!selectedId) return;
    if (
      !window.confirm(
        'Выставить состояние для App Review: тариф Lite в БД, дата оплаты и триал в прошлом? В приложении будет доступен полный флоу покупки подписки.',
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

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Пользователи</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Все пользователи приложения. Нажмите на строку, чтобы открыть профиль.
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
          {listLoading ? '…' : `${list.length} из ${total}`}
        </span>
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
                Покупки (store)
              </button>
              <button
                type="button"
                className={`${s.tab} ${activeTab === 'actions' ? s.tabActive : ''}${dk}`}
                onClick={() => setActiveTab('actions')}
              >
                Действия
              </button>
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
                  {selectedUser.freeQuotaSuspended ? (
                    <InfoField
                      label="Причина блокировки"
                      value={selectedUser.adminBlockReason?.trim() || '—'}
                      dk={dk}
                      warn
                    />
                  ) : null}
                </div>
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
              </div>
            )}

            {activeTab === 'purchases' && selectedUser && (
              <div className={s.tabContent}>
                <p className={`${s.purchasesHint}${dk}`}>Подписки из App Store / Google Play (таблица store_entitlements)</p>
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
              </div>
            )}

            {activeTab === 'actions' && selectedUser && (
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

                  <div className={`${s.actionCard}${dk}`}>
                    <h4 className={s.actionTitle}>Демо App Review (истёкшая подписка)</h4>
                    <p className={`${s.actionDesc}${dk}`}>
                      Lite, оплата и 5‑дневный триал в прошлом — без автостарта нового триала; для учётных данных в App
                      Store Connect
                    </p>
                    <button
                      type="button"
                      className={`${s.actionBtn} ${s.actionBtnBlue}`}
                      disabled={actionBusy}
                      onClick={() => void handleAppReviewExpiredDemo()}
                    >
                      Выставить для ревью Apple
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
