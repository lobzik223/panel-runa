import { useEffect, useState } from 'react';
import { getPromoCodes, createPromoCode, type PromoCodeItem } from '../api/client';

export default function Promo() {
  const [list, setList] = useState<PromoCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '',
    name: '',
    discountRubles: 0,
    validUntil: '',
  });

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
    setSubmitting(true);
    setMessage(null);
    createPromoCode({
      code: form.code,
      name: form.name,
      discountRubles: form.discountRubles,
      validUntil: form.validUntil,
    })
      .then(() => {
        setForm({ code: '', name: '', discountRubles: 0, validUntil: '' });
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
      <div className="flex flex-wrap gap-3 mb-6">
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
              <label className="block text-sm text-gray-600 mb-1">Скидка (₽)</label>
              <input
                type="number"
                min={0}
                value={form.discountRubles || ''}
                onChange={(e) => setForm((f) => ({ ...f, discountRubles: Number.parseInt(e.target.value, 10) || 0 }))}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Скидка (₽)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действует до</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Оплат</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {list.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{p.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.discountRubles}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(p.validUntil).toLocaleDateString('ru')}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.paymentsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="p-4 text-gray-500 text-sm">Промокодов пока нет.</p>}
        </div>
      )}
    </div>
  );
}
