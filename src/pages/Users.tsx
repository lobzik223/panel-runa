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
  const [blockUntil, setBlockUntil] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [grantDays, setGrantDays] = useState(30);
  const [reduceDays, setReduceDays] = useState(7);
  const [subSubmitting, setSubSubmitting] = useState(false);

  const limit = 20;

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
    setBlockUntil('');
  }, []);

  const handleBlock = () => {
    if (!selectedUser) return;
    setBlockSubmitting(true);
    blockUser(selectedUser.id, {
      reason: blockReason || 'Заблокировано администратором',
      until: blockUntil || undefined,
    })
      .then(() => {
        openUser(selectedUser.id);
        setRefreshKey((k) => k + 1);
      })
      .catch(() => {})
      .finally(() => setBlockSubmitting(false));
  };

  const handleUnblock = () => {
    if (!selectedUser) return;
    setBlockSubmitting(true);
    unblockUser(selectedUser.id)
      .then(() => {
        openUser(selectedUser.id);
        setRefreshKey((k) => k + 1);
      })
      .catch(() => {})
      .finally(() => setBlockSubmitting(false));
  };

  const handleGrantSub = () => {
    if (!selectedUser) return;
    setSubSubmitting(true);
    grantSubscription(selectedUser.id, grantDays)
      .then(() => {
        openUser(selectedUser.id);
        setRefreshKey((k) => k + 1);
      })
      .catch(() => {})
      .finally(() => setSubSubmitting(false));
  };

  const handleReduceSub = () => {
    if (!selectedUser) return;
    setSubSubmitting(true);
    reduceSubscription(selectedUser.id, reduceDays)
      .then(() => {
        openUser(selectedUser.id);
        setRefreshKey((k) => k + 1);
      })
      .catch(() => {})
      .finally(() => setSubSubmitting(false));
  };

  const handleRevokeSub = () => {
    if (!selectedUser) return;
    if (!window.confirm('Убрать подписку у пользователя? Доступ к Premium будет отключён.')) return;
    setSubSubmitting(true);
    revokeSubscription(selectedUser.id)
      .then(() => {
        openUser(selectedUser.id);
        setRefreshKey((k) => k + 1);
      })
      .catch(() => {})
      .finally(() => setSubSubmitting(false));
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
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-gray-600">Добавить (тариф по дням):</span>
                {[7, 30, 90, 365].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setGrantDays(d)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${grantDays === d ? 'bg-runa-orange text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {d} дн.
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={360}
                  value={grantDays}
                  onChange={(e) => setGrantDays(Number(e.target.value) || 30)}
                  className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={handleGrantSub}
                  disabled={subSubmitting}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {subSubmitting ? '…' : 'Добавить'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
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
            <div className="p-6 border-t border-gray-100 space-y-3">
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
                  <input
                    type="text"
                    placeholder="Причина блокировки (необязательно)"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="datetime-local"
                    placeholder="Заблокировать до"
                    value={blockUntil}
                    onChange={(e) => setBlockUntil(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleBlock}
                    disabled={blockSubmitting}
                    className="w-full py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {blockSubmitting ? '…' : 'Заблокировать'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
