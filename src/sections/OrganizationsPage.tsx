import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSearch } from '@/components/Icons';
import styles from './Section.module.css';
import s from './UsersPage.module.css';
import {
  type AdminOrgDto,
  type AdminOrgDetail,
  type AdminOrgMemberDto,
  type OrgPlanDto,
  type OrgPlanId,
  type OrgVerificationStatus,
  fetchAdminOrganizations,
  fetchAdminOrganizationDetail,
  fetchOrgPlans,
  grantOrgTier,
  revokeOrgTier,
  grantOrgMemberTier,
  revokeOrgMemberTier,
  resetOrgAll,
  setOrgVerification,
  renameOrganization,
} from '@/lib/adminApi';
import { useAdminRole } from '@/hooks/useAdminRole';

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
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

const VERIFICATION_LABEL: Record<string, string> = {
  verified: 'Верифицирована',
  pending: 'Ожидает проверки',
  rejected: 'Отклонена',
  unverified: 'Не верифицирована',
};

function verificationLabel(status: string): string {
  return VERIFICATION_LABEL[status] || status;
}

function subscriptionLabel(status: string): string {
  if (status === 'active') return 'Активна';
  if (status === 'none') return 'Нет';
  return status;
}

export function OrganizationsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const dk = isDark ? ' ' + s.dk : '';
  const { canManageUsers } = useAdminRole();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [list, setList] = useState<AdminOrgDto[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);

  const [plans, setPlans] = useState<OrgPlanDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminOrgDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'payments' | 'actions'>('info');

  const [grantPlan, setGrantPlan] = useState<OrgPlanId>('super');
  const [grantDays, setGrantDays] = useState(30);
  const [grantApplyMembers, setGrantApplyMembers] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedQ, pageSize]);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetchOrgPlans();
        setPlans(r.plans);
      } catch {
        setPlans([]);
      }
    })();
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const r = await fetchAdminOrganizations({ q: debouncedQ, limit: pageSize, offset: pageIndex * pageSize });
      setList(r.organizations);
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

  const openOrg = async (o: AdminOrgDto) => {
    setSelectedId(o.id);
    setDetail(null);
    setActiveTab('info');
    setDetailError(null);
    setActionError(null);
    setDetailLoading(true);
    try {
      const r = await fetchAdminOrganizationDetail(o.id);
      setDetail(r);
      setGrantPlan((r.organization.planId as OrgPlanId) || 'super');
      setRenameValue(r.organization.name || '');
    } catch (e) {
      setDetailError((e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeOrg = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    setActionError(null);
  };

  const refreshDetail = async (orgId: string) => {
    const r = await fetchAdminOrganizationDetail(orgId);
    setDetail(r);
    setRenameValue(r.organization.name || '');
    await loadList();
  };

  const runAction = async (fn: () => Promise<unknown>) => {
    if (!selectedId) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await fn();
      await refreshDetail(selectedId);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleSetVerification = (status: OrgVerificationStatus) => {
    const confirmMap: Record<OrgVerificationStatus, string> = {
      verified: 'Подтвердить организацию? Данные проверены вручную.',
      rejected: 'Отклонить организацию? Статус верификации станет «Отклонена».',
      pending: 'Вернуть организацию в статус «Ожидает проверки»?',
      unverified: 'Сбросить верификацию организации?',
    };
    if (!window.confirm(confirmMap[status])) return;
    void runAction(() => setOrgVerification(selectedId!, status));
  };

  const verificationBadgeClass = (status: string) => {
    if (status === 'verified') return s.badgeGreen;
    if (status === 'rejected') return s.badgeRed;
    return s.badgeGray;
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(pageIndex, Math.max(0, totalPages - 1));
  const org = detail?.organization ?? null;
  const reset = detail?.reset ?? null;

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Организации</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Данные организаций, оплаты и участники. Ручное подтверждение организации, выдача и снятие
        тарифов, обнуление тарифа для всех (только в течение 1 дня после покупки, без возврата).
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
          placeholder="Поиск по названию, email, ИНН, коду, UUID..."
          className={`${s.searchInput}${dk}`}
        />
        <span className={`${s.searchCount}${dk}`}>
          {listLoading ? '…' : `В базе: ${total.toLocaleString('ru-RU')}`}
        </span>
      </div>

      <div className={`${s.listToolbar}${dk}`}>
        <div className={s.listToolbarLeft}>
          <span className={`${s.rangeText}${dk}`}>
            {listLoading ? 'Загрузка…' : `Всего организаций: ${total.toLocaleString('ru-RU')}`}
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
              <th>Организация</th>
              <th>ОПФ / ИНН</th>
              <th>Тариф</th>
              <th>Участники</th>
              <th>Верификация</th>
              <th>Создана</th>
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
                  {debouncedQ ? 'Ничего не найдено.' : 'Нет организаций в базе.'}
                </td>
              </tr>
            ) : (
              list.map((o) => (
                <tr key={o.id} className={s.userRow} onClick={() => void openOrg(o)}>
                  <td>
                    <div className={s.userCell}>
                      <div className={`${s.avatarSmall}${dk}`}>
                        <span>{(o.name || '?')[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <div className={`${s.userName}${dk}`}>{o.name || '—'}</div>
                        <div className={`${s.userEmail}${dk}`}>{o.adminEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={`${s.deviceText}${dk}`}>
                      {o.legalForm || '—'}
                      <br />
                      {o.inn || '—'}
                    </div>
                  </td>
                  <td>
                    <span className={`${s.planChip}${dk}`}>{o.planLabel}</span>
                    <div className={`${s.userEmail}${dk}`} style={{ fontSize: 11 }}>
                      {subscriptionLabel(o.subscriptionStatus)}
                    </div>
                  </td>
                  <td>
                    <span className={`${s.deviceText}${dk}`}>
                      {o.activeMembers}/{o.seatCount}
                    </span>
                  </td>
                  <td>
                    <span className={`${s.badge} ${verificationBadgeClass(o.verificationStatus)}`}>
                      {verificationLabel(o.verificationStatus)}
                    </span>
                  </td>
                  <td>{formatDateRu(o.createdAt)}</td>
                  <td>
                    <span className={`${s.openArrow}${dk}`}>→</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedId && (
        <div className={s.overlay} onClick={closeOrg}>
          <div className={`${s.modal}${dk}`} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div className={s.modalAvatar}>
                <span>{(org?.name || '?')[0].toUpperCase()}</span>
              </div>
              <div className={s.modalHeaderInfo}>
                <h2 className={s.modalName}>{org?.name || 'Организация'}</h2>
                <span className={`${s.modalEmail}${dk}`}>{org?.adminEmail}</span>
                <div className={s.modalMeta}>
                  {org ? (
                    <span className={`${s.badge} ${verificationBadgeClass(org.verificationStatus)}`}>
                      {verificationLabel(org.verificationStatus)}
                    </span>
                  ) : null}
                  {org ? (
                    <span className={s.onlineLabel}>
                      {org.planLabel} · {subscriptionLabel(org.subscriptionStatus)}
                    </span>
                  ) : null}
                </div>
              </div>
              <button type="button" className={`${s.closeBtn}${dk}`} onClick={closeOrg}>
                ✕
              </button>
            </div>

            {detailError ? <p className={`${s.inlineError}${dk}`}>{detailError}</p> : null}
            {actionError ? <p className={`${s.inlineError}${dk}`}>{actionError}</p> : null}
            {detailLoading ? <p className={`${s.purchasesHint}${dk}`}>Загрузка организации…</p> : null}

            <div className={`${s.tabs}${dk}`}>
              <button
                type="button"
                className={`${s.tab} ${activeTab === 'info' ? s.tabActive : ''}${dk}`}
                onClick={() => setActiveTab('info')}
              >
                Информация
              </button>
              <button
                type="button"
                className={`${s.tab} ${activeTab === 'members' ? s.tabActive : ''}${dk}`}
                onClick={() => setActiveTab('members')}
              >
                Участники ({detail?.members.length ?? 0})
              </button>
              <button
                type="button"
                className={`${s.tab} ${activeTab === 'payments' ? s.tabActive : ''}${dk}`}
                onClick={() => setActiveTab('payments')}
              >
                Оплаты ({detail?.payments.length ?? 0})
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

            {activeTab === 'info' && org && (
              <div className={s.tabContent}>
                <div className={s.infoGrid}>
                  <InfoField label="ID организации" value={org.id} dk={dk} />
                  <InfoField label="Название" value={org.name} dk={dk} />
                  <InfoField label="ОПФ" value={org.legalForm || '—'} dk={dk} />
                  <InfoField label="ИНН" value={org.inn || '—'} dk={dk} />
                  <InfoField label="КПП" value={org.kpp || '—'} dk={dk} />
                  <InfoField label="ОГРН/ОГРНИП" value={org.ogrn || '—'} dk={dk} />
                  <InfoField label="Юридический адрес" value={org.legalAddress || '—'} dk={dk} />
                  <InfoField label="Администратор" value={org.adminName || '—'} dk={dk} />
                  <InfoField label="Email администратора" value={org.adminEmail} dk={dk} />
                  <InfoField label="Телефон" value={org.adminPhone || '—'} dk={dk} />
                  <InfoField label="Код приглашения" value={org.joinCode || '—'} dk={dk} accent />
                  <InfoField label="Тариф" value={org.planLabel} dk={dk} accent />
                  <InfoField label="Подписка" value={subscriptionLabel(org.subscriptionStatus)} dk={dk} />
                  <InfoField label="Подписка до" value={formatDateRu(org.subscriptionExpiresAt)} dk={dk} />
                  <InfoField label="Мест" value={`${org.activeMembers}/${org.seatCount}`} dk={dk} />
                  <InfoField
                    label="Статус верификации"
                    value={verificationLabel(org.verificationStatus)}
                    dk={dk}
                    accent={org.verificationStatus === 'verified'}
                    warn={org.verificationStatus === 'rejected'}
                  />
                  <InfoField label="Верифицирована" value={formatDateTimeRu(org.verifiedAt)} dk={dk} />
                  <InfoField label="Создана" value={formatDateRu(org.createdAt)} dk={dk} />
                </div>
              </div>
            )}

            {activeTab === 'members' && detail && (
              <div className={s.tabContent}>
                {detail.members.length === 0 ? (
                  <p className={`${s.emptyMsg}${dk}`}>В организации нет участников.</p>
                ) : (
                  <div className={s.purchasesList}>
                    {detail.members.map((m) => (
                      <MemberRow
                        key={m.id}
                        member={m}
                        dk={dk}
                        canManage={canManageUsers}
                        busy={actionBusy}
                        onGrant={() =>
                          m.userId
                            ? void runAction(() =>
                                grantOrgMemberTier(selectedId!, m.userId!, { planId: grantPlan, days: grantDays }),
                              )
                            : undefined
                        }
                        onRevoke={() =>
                          m.userId
                            ? void runAction(() => revokeOrgMemberTier(selectedId!, m.userId!))
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'payments' && detail && (
              <div className={s.tabContent}>
                {detail.payments.length === 0 ? (
                  <p className={`${s.emptyMsg}${dk}`}>Нет оплат по организации.</p>
                ) : (
                  <div className={s.purchasesList}>
                    {detail.payments.map((p) => (
                      <div key={p.id} className={`${s.purchaseCard}${dk}`}>
                        <div className={s.purchaseLeft}>
                          <span className={`${s.purchasePlan}${dk}`}>{p.description || p.type}</span>
                          <span className={`${s.purchaseDate}${dk}`}>
                            {p.type} · {formatDateTimeRu(p.paidAt || p.createdAt)}
                          </span>
                        </div>
                        <div className={`${s.purchaseRight} ${s.purchaseRightStack}`}>
                          <span className={`${s.purchasePrice}${dk}`}>{p.amountRub.toLocaleString('ru-RU')} ₽</span>
                          <span
                            className={`${s.badge} ${p.status === 'succeeded' ? s.badgeGreen : s.badgeGray}`}
                          >
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'actions' && canManageUsers && org && (
              <div className={s.tabContent}>
                <div className={s.actionsGrid}>
                  <div className={`${s.actionCard}${dk} ${s.actionCardWide}`}>
                    <h4 className={s.actionTitle}>Название организации</h4>
                    <p className={`${s.actionDesc}${dk}`}>
                      Главный администратор может изменить название организации. Оно сразу обновится
                      в панели и в кабинете организации.
                    </p>
                    <div className={s.actionsRow} style={{ flexWrap: 'wrap', gap: 8 }}>
                      <input
                        type="text"
                        maxLength={255}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className={`${s.searchInput}${dk}`}
                        style={{ flex: 1, minWidth: 220 }}
                        placeholder="Новое название организации"
                        disabled={actionBusy}
                      />
                      <button
                        type="button"
                        className={`${s.actionBtn} ${s.actionBtnBlue}`}
                        disabled={
                          actionBusy ||
                          !renameValue.trim() ||
                          renameValue.trim() === (org.name || '').trim()
                        }
                        onClick={() =>
                          void runAction(() => renameOrganization(selectedId!, renameValue.trim()))
                        }
                      >
                        Сохранить название
                      </button>
                    </div>
                  </div>

                  <div className={`${s.actionCard}${dk} ${s.actionCardWide}`}>
                    <h4 className={s.actionTitle}>Подтверждение организации (вручную)</h4>
                    <p className={`${s.actionDesc}${dk}`}>
                      Проверьте введённые клиентом данные (ОПФ, ИНН, адрес) на вкладке «Информация» и
                      подтвердите организацию. Текущий статус: <strong>{verificationLabel(org.verificationStatus)}</strong>.
                    </p>
                    <div className={s.actionsRow}>
                      <button
                        type="button"
                        className={`${s.actionBtn} ${s.actionBtnGreen}`}
                        disabled={actionBusy || org.verificationStatus === 'verified'}
                        onClick={() => handleSetVerification('verified')}
                      >
                        Подтвердить
                      </button>
                      <button
                        type="button"
                        className={`${s.actionBtn} ${s.actionBtnRed}`}
                        disabled={actionBusy || org.verificationStatus === 'rejected'}
                        onClick={() => handleSetVerification('rejected')}
                      >
                        Отклонить
                      </button>
                      <button
                        type="button"
                        className={`${s.actionBtn} ${s.actionBtnGhost}${dk}`}
                        disabled={actionBusy || org.verificationStatus === 'pending'}
                        onClick={() => handleSetVerification('pending')}
                      >
                        В ожидание
                      </button>
                    </div>
                  </div>

                  <div className={`${s.actionCard}${dk} ${s.actionCardWide}`}>
                    <h4 className={s.actionTitle}>Организационный тариф</h4>
                    <p className={`${s.actionDesc}${dk}`}>
                      Выдать/продлить тариф организации без оплаты. «Применить участникам» выдаст
                      соответствующий индивидуальный тариф всем активным участникам.
                    </p>
                    <div className={s.actionsRow} style={{ flexWrap: 'wrap', gap: 8 }}>
                      <select
                        className={`${s.pageSizeSelect}${dk}`}
                        value={grantPlan}
                        onChange={(e) => setGrantPlan(e.target.value as OrgPlanId)}
                        disabled={actionBusy}
                      >
                        {(plans.length ? plans : [{ planId: 'super', label: 'Super', pricePerSeatRub: 0 }]).map((p) => (
                          <option key={p.planId} value={p.planId}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={3650}
                        value={grantDays}
                        onChange={(e) => setGrantDays(Math.max(1, Number(e.target.value) || 1))}
                        className={`${s.searchInput}${dk}`}
                        style={{ width: 90 }}
                        disabled={actionBusy}
                      />
                      <label className={`${s.radioLabel}${dk}`}>
                        <input
                          type="checkbox"
                          checked={grantApplyMembers}
                          onChange={(e) => setGrantApplyMembers(e.target.checked)}
                          disabled={actionBusy}
                        />
                        <span className={`${s.radioText}${dk}`}>Применить участникам</span>
                      </label>
                    </div>
                    <div className={s.actionsRow} style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        className={`${s.actionBtn} ${s.actionBtnBlue}`}
                        disabled={actionBusy}
                        onClick={() =>
                          void runAction(() =>
                            grantOrgTier(selectedId!, {
                              planId: grantPlan,
                              days: grantDays,
                              applyToMembers: grantApplyMembers,
                            }),
                          )
                        }
                      >
                        Выдать тариф
                      </button>
                      <button
                        type="button"
                        className={`${s.actionBtn} ${s.actionBtnOrange}`}
                        disabled={actionBusy || org.subscriptionStatus === 'none'}
                        onClick={() => {
                          if (
                            !window.confirm(
                              'Снять организационный тариф? Индивидуальные тарифы активных участников также будут сняты (лимиты упадут). Возврат средств не производится.',
                            )
                          )
                            return;
                          void runAction(() => revokeOrgTier(selectedId!));
                        }}
                      >
                        Снять тариф
                      </button>
                    </div>
                  </div>

                  <div className={`${s.actionCard}${dk} ${s.actionCardWide}`}>
                    <h4 className={s.actionTitle}>Обнулить тариф для всех</h4>
                    <p className={`${s.actionDesc}${dk}`}>
                      Снимает организационный тариф и индивидуальные тарифы всех участников. Доступно
                      только в течение 1 дня (24 часов) после покупки. Возврату не подлежит. Если
                      лимитный тариф уже использован (сделан хотя бы один слайд и т.п.) — обнуление
                      без возврата, спорные случаи — через поддержку.
                    </p>
                    <p className={`${s.actionDesc}${dk}`} style={{ marginTop: 6, fontWeight: 600 }}>
                      {reset && reset.purchasedAt
                        ? reset.resetAllowed
                          ? `Доступно ещё ~${reset.hoursLeft ?? 0} ч (покупка ${formatDateTimeRu(reset.purchasedAt)})`
                          : `Окно истекло (покупка ${formatDateTimeRu(reset.purchasedAt)})`
                        : 'Нет активной покупки для обнуления.'}
                    </p>
                    <button
                      type="button"
                      className={`${s.actionBtn} ${s.actionBtnRed}`}
                      disabled={actionBusy || !reset?.resetAllowed}
                      onClick={() => {
                        if (
                          !window.confirm(
                            'Обнулить тариф для ВСЕХ (организация + участники)? Действие необратимо, возврат средств не производится.',
                          )
                        )
                          return;
                        void runAction(() => resetOrgAll(selectedId!));
                      }}
                    >
                      Обнулить для всех
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function MemberRow({
  member,
  dk,
  canManage,
  busy,
  onGrant,
  onRevoke,
}: {
  member: AdminOrgMemberDto;
  dk: string;
  canManage: boolean;
  busy: boolean;
  onGrant: () => void;
  onRevoke: () => void;
}) {
  return (
    <div className={`${s.purchaseCard}${dk}`}>
      <div className={s.purchaseLeft}>
        <span className={`${s.purchasePlan}${dk}`}>
          {member.userName || member.invitedEmail || '—'}
          {member.role === 'admin' ? ' · админ' : ''}
        </span>
        <span className={`${s.purchaseDate}${dk}`}>
          {member.userEmail || member.invitedEmail || '—'} · тариф: {member.subscriptionTier || 'free'} ·{' '}
          {member.seatStatus}
        </span>
      </div>
      {canManage && member.userId ? (
        <div className={s.actionsRow} style={{ gap: 6 }}>
          <button
            type="button"
            className={`${s.actionBtn} ${s.actionBtnGreen}`}
            disabled={busy}
            onClick={onGrant}
          >
            Выдать
          </button>
          <button
            type="button"
            className={`${s.actionBtn} ${s.actionBtnOrange}`}
            disabled={busy}
            onClick={onRevoke}
          >
            Снять
          </button>
        </div>
      ) : null}
    </div>
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
      <span className={`${s.infoValue} ${accent ? s.infoValueAccent : ''} ${warn ? s.infoValueWarn : ''}`}>
        {value}
      </span>
    </div>
  );
}
