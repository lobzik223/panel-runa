import { useEffect, useState } from 'react';
import { getUsers, type UserListItem } from '../api/client';

export default function Users() {
  const [data, setData] = useState<{ items: UserListItem[]; total: number; page: number; limit: number } | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getUsers({ search: search || undefined, page, limit })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e.response?.data?.message || 'Ошибка загрузки');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, page]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Пользователи</h1>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Поиск по email или имени..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-runa-orange focus:border-runa-orange"
        />
      </div>
      {error && <p className="text-red-600 mb-4">{error}</p>}
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Регистрация</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.items.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{u.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{u.email ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{u.name}</td>
                      <td className="px-4 py-3 text-sm">
                        {u.subscription?.status === 'ACTIVE' && u.subscription.currentPeriodEnd ? (
                          <span className="text-green-600">
                            до {new Date(u.subscription.currentPeriodEnd).toLocaleDateString('ru')}
                          </span>
                        ) : u.premiumUntil ? (
                          <span className="text-gray-600">Premium до {new Date(u.premiumUntil).toLocaleDateString('ru')}</span>
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
    </div>
  );
}
