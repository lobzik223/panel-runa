import { useEffect, useState, useCallback } from 'react';
import {
  getUsers,
  getUser,
  blockUser,
  unblockUser,
  grantSubscription,
  reduceSubscription,
  revokeSubscription,
  type UserListItem,
  type UserDetail,
} from '../api/client';

export default function Users() {
  const [data, setData] = useState<{ items: UserListItem[]; total: number; page: number; limit: number } | null>(null);
  const [searchById, setSearchById] = useState('');
  const [searchByEmail, setSearchByEmail] = useState('');
  const [debouncedEmail, setDebouncedEmail] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockReasonPreset, setBlockReasonPreset] = useState('');
  const [blockDurationPreset, setBlockDurationPreset] = useState<number>(7); // 1, 7, 30, or -1 for forever
  const [refreshKey, setRefreshKey] = useState(0);
  const [grantDays, setGrantDays] = useState(30);
  const [reduceDays, setReduceDays] = useState(7);
  const [subSubmitting, setSubSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    action: 'grant' | 'reduce' | 'revoke' | 'block' | 'unblock';
    payload?: { days?: number; reason?: string; until?: string };
  } | null>(null);
  const [passwordModal, setPasswordModal] = useState<{ open: boolean; password: string; error: string | null }>({
    open: false,
    password: '',
    error: null,
  });

  const limit = 20;
  const SUBSCRIPTION_PRESETS = [
    { days: 30, label: '1 мес.' },
    { days: 90, label: '3 мес.' },
    { days: 180, label: '6 мес.' },
    { days: 365, label: '1 год' },
  ] as const;
  const BLOCK_REASONS = [
    { value: 'Спам', label: 'Спам' },
    { value: 'Нарушение правил', label: 'Нарушение правил' },
    { value: 'Мошенничество', label: 'Мошенничество' },
    { value: '', label: 'Другое (указать ниже)' },
  ] as const;
  const BLOCK_DURATIONS = [
    { days: 1, label: '1 день' },
    { days: 7, label: '7 дней' },
    { days: 30, label: '30 дней' },
    { days: -1, label: 'Навсегда' },
  ] as const;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedEmail(searchByEmail), 400);
    return () => clearTimeout(t);
  }, [searchByEmail]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const userIdNum = searchById.trim() !== '' ? parseInt(searchById.trim(), 10) : undefined;
    const validUserId = userIdNum != null && !Number.isNaN(userIdNum) && userIdNum >= 1 ? userIdNum : undefined;
    getUsers({
        search: debouncedEmail.trim() || undefined,
        userId: validUserId,
        page,
        limit,
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) {
          const status = e.response?.status;
          const msg = e.response?.data?.message || e.message || 'Ошибка загрузки';
          setError(status === 404 ? 'Эндпоинт не найден. Пересоберите и перезапустите бэкенд (см. docs/ADMIN-API-DEPLOY.md).' : msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchById, debouncedEmail, page, refreshKey]);

  const openUser = useCallback((id: number) => {
    setLoadingDetail(true);
    setSelectedUser(null);
    getUser(id)
      .then((u) => setSelectedUser(u))
      .catch(() => setSelectedUser(null))
      .finally(() => setLoadingDetail(false));
    setBlockReason('');
    setBlockReasonPreset('');
    setBlockDurationPreset(7);
  }, []);

  const handleBlock = () => {
    if (!selectedUser) return;
    const reason = blockReasonPreset === '' ? (blockReason || 'Заблокировано администратором') : blockReasonPreset;
    const until =
      blockDurationPreset === -1
        ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + blockDurationPreset * 24 * 60 * 60 * 1000).toISOString();
    setConfirmDialog({
      title: 'Подтверждение блокировки',
      message: `Заблокировать пользователя ${selectedUser.name} (ID ${selectedUser.id})? Причина: ${reason}. Срок: ${blockDurationPreset === -1 ? 'навсегда' : blockDurationPreset + ' дн.'}`,
      action: 'block',
      payload: { reason, until },
    });
  };

  const handleUnblock = () => {
    if (!selectedUser) return;
    setConfirmDialog({
      title: 'Разблокировать',
      message: `Разблокировать пользователя ${selectedUser.name}?`,
      action: 'unblock',
    });
  };

  const handleGrantSub = () => {
    if (!selectedUser) return;
    setConfirmDialog({
      title: 'Выдать подписку',
      message: `Выдать подписку на ${grantDays} дней пользователю ${selectedUser.name}?`,
      action: 'grant',
      payload: { days: grantDays },
    });
  };

  const handleReduceSub = () => {
    if (!selectedUser) return;
    setConfirmDialog({
      title: 'Уменьшить подписку',
      message: `Уменьшить подписку на ${reduceDays} дней у пользователя ${selectedUser.name}?`,
      action: 'reduce',
      payload: { days: reduceDays },
    });
  };

  const handleRevokeSub = () => {
    if (!selectedUser) return;
    setConfirmDialog({
      title: 'Убрать подписку',
      message: `Убрать подписку полностью у пользователя ${selectedUser.name}? Доступ к Premium будет отключён.`,
      action: 'revoke',
    });
  };

  const [pendingAction, setPendingAction] = useState<typeof confirmDialog>(null);

  const onConfirmDialogConfirm = () => {
    if (!confirmDialog) return;
    setPendingAction(confirmDialog);
    setConfirmDialog(null);
    setPasswordModal({ open: true, password: '', error: null });
  };

  const submitPassword = () => {
    const p = passwordModal.password.trim();
    if (!p) {
      setPasswordModal((m) => ({ ...m, error: 'Введите пароль' }));
      return;
    }
    if (!pendingAction || !selectedUser) return;
    setPasswordModal((m) => ({ ...m, error: null }));
    setBlockSubmitting(true);
    setSubSubmitting(true);
    const done = () => {
      setPendingAction(null);
      setPasswordModal({ open: false, password: '', error: null });
      setSubSubmitting(false);
      setBlockSubmitting(false);
    };
    if (pendingAction.action === 'grant' && pendingAction.payload?.days) {
      grantSubscription(selectedUser.id, pendingAction.payload.days, p)
        .then(() => { openUser(selectedUser.id); setRefreshKey((k) => k + 1); done(); })
        .catch((e) => { setPasswordModal((m) => ({ ...m, error: e.response?.data?.message || 'Ошибка' })); setSubSubmitting(false); setBlockSubmitting(false); });
    } else if (pendingAction.action === 'reduce' && pendingAction.payload?.days) {
      reduceSubscription(selectedUser.id, pendingAction.payload.days, p)
        .then(() => { openUser(selectedUser.id); setRefreshKey((k) => k + 1); done(); })
        .catch((e) => { setPasswordModal((m) => ({ ...m, error: e.response?.data?.message || 'Ошибка' })); setSubSubmitting(false); setBlockSubmitting(false); });
    } else if (pendingAction.action === 'revoke') {
      revokeSubscription(selectedUser.id, p)
        .then(() => { openUser(selectedUser.id); setRefreshKey((k) => k + 1); done(); })
        .catch((e) => { setPasswordModal((m) => ({ ...m, error: e.response?.data?.message || 'Ошибка' })); setSubSubmitting(false); setBlockSubmitting(false); });
    } else if (pendingAction.action === 'block' && pendingAction.payload?.until !== undefined) {
      blockUser(selectedUser.id, { reason: pendingAction.payload.reason ?? 'Заблокировано администратором', until: pendingAction.payload.until, password: p })
        .then(() => { openUser(selectedUser.id); setRefreshKey((k) => k + 1); done(); })
        .catch((e) => { setPasswordModal((m) => ({ ...m, error: e.response?.data?.message || 'Ошибка' })); setSubSubmitting(false); setBlockSubmitting(false); });
    } else if (pendingAction.action === 'unblock') {
      unblockUser(selectedUser.id, p)
        .then(() => { openUser(selectedUser.id); setRefreshKey((k) => k + 1); done(); })
        .catch((e) => { setPasswordModal((m) => ({ ...m, error: e.response?.data?.message || 'Ошибка' })); setSubSubmitting(false); setBlockSubmitting(false); });
    }
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const isBlocked = selectedUser?.blockedUntil && new Date(selectedUser.blockedUntil) > new Date();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Пользователи</h1>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          inputMode="numeric"
          placeholder="Поиск по ID"
          value={searchById}
          onChange={(e) => setSearchById(e.target.value.replace(/\D/g, '').slice(0, 10))}
          className="px-3 py-2 border border-gray-300 rounded-lg w-28 focus:ring-2 focus:ring-runa-orange focus:border-runa-orange"
          aria-label="Поиск по ID пользователя"
        />
        <input
          type="search"
          placeholder="Поиск по email или имени..."
          value={searchByEmail}
          onChange={(e) => setSearchByEmail(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg w-72 focus:ring-2 focus:ring-runa-orange focus:border-runa-orange"
          aria-label="Поиск по email или имени"
        />
      </div>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}
      {loading && !data ? (
        <p className="text-gray-500">Загрузка…</p>
      ) : data && data.items.length === 0 ? (
        <p className="text-gray-500">Пользователей не найдено.</p>
      ) : data ? (
        <>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Имя</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Подписка</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Блок</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Регистрация</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.items.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => openUser(u.id)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm text-gray-600">{u.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{u.email ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{u.name}</td>
                      <td className="px-4 py-3 text-sm">
                        {u.subscription?.status === 'ACTIVE' && u.subscription.currentPeriodEnd ? (
                          <span className="text-green-600">
                            до {new Date(u.subscription.currentPeriodEnd).toLocaleDateString('ru')}
                          </span>
                        ) : u.premiumUntil ? (
                          <span className="text-gray-600">
                            Premium до {new Date(u.premiumUntil).toLocaleDateString('ru')}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {u.blockedUntil && new Date(u.blockedUntil) > new Date() ? (
                          <span className="text-red-600" title={u.blockReason ?? ''}>
                            до {new Date(u.blockedUntil).toLocaleDateString('ru')}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleString('ru')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-100"
              >
                Назад
              </button>
              <span className="text-sm text-gray-600">
                Страница {page} из {totalPages} (всего {data.total})
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-100"
              >
                Вперёд
              </button>
            </div>
          )}
        </>
      ) : null}

      {loadingDetail && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-md w-full mx-4">
            <p className="text-gray-600">Загрузка профиля…</p>
          </div>
        </div>
      )}

      {selectedUser && !loadingDetail && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <h2 className="text-xl font-bold text-gray-800">Профиль пользователя</h2>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <p><span className="text-gray-500">ID:</span> {selectedUser.id}</p>
              <p><span className="text-gray-500">Email:</span> {selectedUser.email ?? '—'}</p>
              <p><span className="text-gray-500">Имя:</span> {selectedUser.name}</p>
              <p><span className="text-gray-500">Телефон:</span> {selectedUser.phoneE164 ?? '—'}</p>
              <p><span className="text-gray-500">Регистрация:</span> {new Date(selectedUser.createdAt).toLocaleString('ru')}</p>
              <p>
                <span className="text-gray-500">Подписка:</span>{' '}
                {selectedUser.subscription?.status === 'ACTIVE' && selectedUser.subscription.currentPeriodEnd ? (
                  <span className="text-green-600">до {new Date(selectedUser.subscription.currentPeriodEnd).toLocaleDateString('ru')}</span>
                ) : selectedUser.premiumUntil ? (
                  <span>Premium до {new Date(selectedUser.premiumUntil).toLocaleDateString('ru')}</span>
                ) : (
                  '—'
                )}
              </p>
              {selectedUser.blockedUntil && (
                <p>
                  <span className="text-gray-500">Заблокирован до:</span>{' '}
                  <span className="text-red-600">{new Date(selectedUser.blockedUntil).toLocaleString('ru')}</span>
                  {selectedUser.blockReason && ` (${selectedUser.blockReason})`}
                </p>
              )}
            </div>

            {selectedUser.subscriptionHistory && selectedUser.subscriptionHistory.length > 0 && (
              <div className="p-6 border-t border-gray-100">
                <h3 className="font-medium text-gray-800 mb-2">История подписок (последние 5)</h3>
                <ul className="space-y-1.5 text-sm">
                  {selectedUser.subscriptionHistory.map((h, i) => (
                    <li key={i} className="flex justify-between items-start gap-2 text-gray-600">
                      <span>
                        {h.action === 'granted' && 'Добавлено'}
                        {h.action === 'reduced' && 'Уменьшено'}
                        {h.action === 'revoked' && 'Снято'}
                        {h.action === 'payment' && 'Оплата'}
                        {!['granted', 'reduced', 'revoked', 'payment'].includes(h.action) && h.action}
                        {h.details && ` — ${h.details}`}
                      </span>
                      <span className="text-gray-400 whitespace-nowrap">{new Date(h.createdAt).toLocaleString('ru')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedUser.blockHistory && selectedUser.blockHistory.length > 0 && (
              <div className="p-6 border-t border-gray-100">
                <h3 className="font-medium text-gray-800 mb-2">Блокировки и нарушения</h3>
                <ul className="space-y-2 text-sm">
                  {selectedUser.blockHistory.map((b, i) => (
                    <li key={i} className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-red-600 font-medium">
                          {b.unblockedAt ? 'Разблокирован' : 'Заблокирован'}
                        </span>
                        <span className="text-gray-400">{new Date(b.blockedAt).toLocaleString('ru')}</span>
                      </div>
                      {b.reason && <p className="text-gray-600 mt-0.5">Причина: {b.reason}</p>}
                      {b.blockedUntil && !b.unblockedAt && (
                        <p className="text-gray-500 text-xs">до {new Date(b.blockedUntil).toLocaleString('ru')}</p>
                      )}
                      {b.unblockedAt && (
                        <p className="text-gray-500 text-xs">Снято: {new Date(b.unblockedAt).toLocaleString('ru')}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-6 border-t border-gray-100 space-y-4">
              <h3 className="font-medium text-gray-800">Управление подпиской</h3>
              {(() => {
                const sub = selectedUser.subscription;
                const endStr = sub?.currentPeriodEnd ?? selectedUser.premiumUntil;
                const startStr = sub?.currentPeriodStart ?? null;
                const endDate = endStr ? new Date(endStr) : null;
                const now = new Date();
                const isActive = endDate && endDate > now;
                const daysLeft = endDate && endDate > now
                  ? Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
                  : null;
                return (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Текущая подписка</p>
                    {!endStr ? (
                      <p className="text-gray-500 text-sm">Нет активной подписки</p>
                    ) : (
                      <ul className="text-sm text-gray-600 space-y-0.5">
                        {startStr && (
                          <li>Период: с {new Date(startStr).toLocaleDateString('ru')} по {new Date(endStr).toLocaleDateString('ru')}</li>
                        )}
                        {!startStr && <li>Действует до: {new Date(endStr).toLocaleDateString('ru')}</li>}
                        {daysLeft != null && (
                          <li className={isActive ? 'text-green-600 font-medium' : ''}>
                            {isActive ? `Осталось дней: ${daysLeft}` : 'Подписка истекла'}
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                );
              })()}
              <p className="text-sm text-gray-600 mb-2">Выберите срок подписки (от 1 месяца до 1 года), затем нажмите «Выдать подписку» и подтвердите.</p>
              <div className="flex flex-wrap gap-2 items-center mb-3">
                {SUBSCRIPTION_PRESETS.map(({ days, label }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setGrantDays(days)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${grantDays === days ? 'bg-runa-orange text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {label}
                  </button>
                ))}
                <span className="text-sm text-gray-500">или</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={grantDays}
                  onChange={(e) => setGrantDays(Number(e.target.value) || 30)}
                  className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-sm text-gray-500">дн.</span>
              </div>
              <button
                type="button"
                onClick={handleGrantSub}
                disabled={subSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {subSubmitting ? '…' : 'Выдать подписку'}
              </button>
              <div className="flex flex-wrap gap-2 items-center mb-3">
                <span className="text-sm text-gray-600">Уменьшить на:</span>
                <input
                  type="number"
                  min={1}
                  max={360}
                  value={reduceDays}
                  onChange={(e) => setReduceDays(Number(e.target.value) || 7)}
                  className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-sm text-gray-500">дней</span>
                <button
                  type="button"
                  onClick={handleReduceSub}
                  disabled={subSubmitting}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                >
                  {subSubmitting ? '…' : 'Уменьшить'}
                </button>
              </div>
              <button
                type="button"
                onClick={handleRevokeSub}
                disabled={subSubmitting}
                className="px-3 py-1.5 border border-red-500 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
              >
                Убрать подписку полностью
              </button>
            </div>
            <div className="p-6 border-t border-gray-100 space-y-4">
              <h3 className="font-medium text-gray-800">Блокировка</h3>
              {isBlocked ? (
                <button
                  type="button"
                  onClick={handleUnblock}
                  disabled={blockSubmitting}
                  className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {blockSubmitting ? '…' : 'Разблокировать'}
                </button>
              ) : (
                <>
                  <p className="text-sm text-gray-600">Нарушение (причина):</p>
                  <div className="flex flex-wrap gap-2">
                    {BLOCK_REASONS.map((r) => (
                      <button
                        key={r.label}
                        type="button"
                        onClick={() => setBlockReasonPreset(r.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm ${blockReasonPreset === r.value ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {blockReasonPreset === '' && (
                    <input
                      type="text"
                      placeholder="Укажите причину блокировки"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  )}
                  <p className="text-sm text-gray-600 mt-2">Срок блокировки:</p>
                  <div className="flex flex-wrap gap-2">
                    {BLOCK_DURATIONS.map((d) => (
                      <button
                        key={d.label}
                        type="button"
                        onClick={() => setBlockDurationPreset(d.days)}
                        className={`px-3 py-1.5 rounded-lg text-sm ${blockDurationPreset === d.days ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleBlock}
                    disabled={blockSubmitting}
                    className="w-full py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 mt-2"
                  >
                    {blockSubmitting ? '…' : 'Заблокировать'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-semibold text-gray-800 mb-2">{confirmDialog.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{confirmDialog.message}</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={onConfirmDialogConfirm}
                className="px-4 py-2 bg-runa-orange text-white rounded-lg text-sm font-medium hover:bg-runa-orange-light"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-semibold text-gray-800 mb-2">Подтверждение паролем</h3>
            <p className="text-gray-600 text-sm mb-3">Введите пароль от вашего аккаунта администратора.</p>
            <input
              type="password"
              placeholder="Пароль"
              value={passwordModal.password}
              onChange={(e) => setPasswordModal((m) => ({ ...m, password: e.target.value, error: null }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
              autoFocus
            />
            {passwordModal.error && (
              <p className="text-red-600 text-sm mb-2">{passwordModal.error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setPasswordModal({ open: false, password: '', error: null });
                  setPendingAction(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={submitPassword}
                className="px-4 py-2 bg-runa-orange text-white rounded-lg text-sm font-medium hover:bg-runa-orange-light"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
