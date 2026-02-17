import { useEffect, useState, useCallback } from 'react';
import {
  getUsers,
  getUser,
  blockUser,
  unblockUser,
  type UserListItem,
  type UserDetail,
} from '../api/client';

export default function Users() {
  const [data, setData] = useState<{ items: UserListItem[]; total: number; page: number; limit: number } | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockUntil, setBlockUntil] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const limit = 20;

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getUsers({ search: search || undefined, page, limit })
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
  }, [search, page, refreshKey]);

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

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const isBlocked = selectedUser?.blockedUntil && new Date(selectedUser.blockedUntil) > new Date();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Пользователи</h1>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Поиск по email или имени..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg w-72 focus:ring-2 focus:ring-runa-orange focus:border-runa-orange"
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
