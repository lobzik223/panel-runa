import { useEffect, useState, useMemo } from 'react';
import { getPromoCodes, createPromoCode, getPromoStats, type PromoCodeItem, type PromoStats } from '../api/client';

export default function Promo() {
  const [list, setList] = useState<PromoCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statsPromoId, setStatsPromoId] = useState<string | null>(null);
  const [stats, setStats] = useState<PromoStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [form, setForm] = useState({
    code: '',
    name: '',
    discountType: 'RUB' as 'RUB' | 'PERCENT',
    discountValue: 0,
    validUntil: '',
  });

  const filteredList = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return list;
    return list.filter((p) => p.code.toUpperCase().includes(q) || p.name.toUpperCase().includes(q));
  }, [list, search]);

  const load = () => {
    setLoading(true);
    setError(null);
    getPromoCodes()
      .then((codes) => setList(codes))
      .catch((e) => setError(e.response?.data?.message || 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.validUntil) {
      setMessage('Укажите дату окончания');
      return;
    }
    if (form.discountType === 'PERCENT' && (form.discountValue < 1 || form.discountValue > 100)) {
      setMessage('Скидка в процентах: от 1 до 100');
      return;
    }
    setSubmitting(true);
    setMessage(null);
    createPromoCode({
      code: form.code,
      name: form.name,
      discountType: form.discountType,
      discountValue: form.discountValue,
      validUntil: form.validUntil,
    })
      .then(() => {
        setForm({ code: '', name: '', discountType: 'RUB', discountValue: 0, validUntil: '' });
        setCreateOpen(false);
        load();
        setMessage('Промокод создан.');
      })
      .catch((e) => setMessage(e.response?.data?.message || 'Ошибка создания'))
      .finally(() => setSubmitting(false));
  };

  const now = new Date();
  const defaultValidUntil = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Промокоды</h1>
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${message.startsWith('Ошибка') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}
        >
          {message}
        </div>
      )}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <input
          type="text"
          placeholder="Поиск по коду или названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg max-w-xs"
        />
        <button
          type="button"
          onClick={() => {
            setCreateOpen(true);
            setMessage(null);
          }}
          className="px-4 py-2 bg-runa-orange text-white rounded-lg hover:bg-runa-orange-light font-medium"
        >
          Создать промокод
        </button>
      </div>

      {createOpen && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6 max-w-md">
          <h3 className="font-medium text-gray-800 mb-4">Новый промокод</h3>
          <form onSubmit={handleCreatePromo} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Код</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="RUNAPROMO"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Название источника</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="YouTube, ТГ-канал"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Тип скидки</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as 'RUB' | 'PERCENT' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="RUB">Рубли (₽)</option>
                <option value="PERCENT">Проценты (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {form.discountType === 'PERCENT' ? 'Скидка (%)' : 'Скидка (₽)'}
              </label>
              <input
                type="number"
                min={form.discountType === 'PERCENT' ? 1 : 0}
                max={form.discountType === 'PERCENT' ? 100 : undefined}
                value={form.discountValue || ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discountValue: Number.parseInt(e.target.value, 10) || 0 }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Действует до</label>
              <input
                type="date"
                value={form.validUntil || defaultValidUntil}
                onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-runa-orange text-white rounded-lg hover:bg-runa-orange-light disabled:opacity-50"
              >
                {submitting ? 'Создание…' : 'Создать'}
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Загрузка…</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Код</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Скидка</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действует до</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Оплат</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredList.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setStatsPromoId(p.id);
                    setStats(null);
                    setStatsLoading(true);
                    getPromoStats(p.id)
                      .then(setStats)
                      .catch(() => setStats(null))
                      .finally(() => setStatsLoading(false));
                  }}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{p.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {p.discountType === 'PERCENT' ? `${p.discountValue}%` : `${p.discountValue} ₽`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(p.validUntil).toLocaleDateString('ru')}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.paymentsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredList.length === 0 && (
          <p className="p-4 text-gray-500 text-sm">
            {list.length === 0 ? 'Промокодов пока нет.' : 'По запросу ничего не найдено.'}
          </p>
        )}
        </div>
      )}

      {statsPromoId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setStatsPromoId(null)}>
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-800 mb-4">Статистика промокода</h3>
            {statsLoading ? (
              <p className="text-gray-500">Загрузка…</p>
            ) : stats ? (
              <div className="space-y-3 text-sm">
                <p><span className="text-gray-600">Код:</span> <strong>{stats.code}</strong></p>
                <p><span className="text-gray-600">Пользователей воспользовалось:</span> <strong>{stats.usersCount}</strong></p>
                <p><span className="text-gray-600">Всего оплат:</span> <strong>{stats.paymentsCount}</strong></p>
                <p><span className="text-gray-600">Общая сумма платежей (с учётом скидки):</span> <strong>{stats.totalAmountRub.toFixed(2)} ₽</strong></p>
                <div>
                  <span className="text-gray-600">По тарифам:</span>
                  <ul className="mt-1 list-disc list-inside">
                    {stats.byPlan.map(({ planId, count }) => (
                      <li key={planId}>
                        {(planId === '1month' && 'Месячная подписка') ||
                          (planId === '6months' && 'Полугодовая подписка') ||
                          (planId === '1year' && 'Годовая подписка') ||
                          planId}
                        : {count}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Не удалось загрузить статистику.</p>
            )}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setStatsPromoId(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
