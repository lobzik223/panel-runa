import { useEffect, useState } from 'react';
import {
  getPromoCodes,
  createPromoCode,
  createPaymentLink,
  getPlans,
  type PromoCodeItem,
} from '../api/client';

export default function Promo() {
  const [list, setList] = useState<PromoCodeItem[]>([]);
  const [plans, setPlans] = useState<{ id: string; durationMonths: number; price: number; description: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '',
    name: '',
    discountRubles: 0,
    validUntil: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    planId: '',
    emailOrId: '',
    promoCodeId: '',
    confirmationUrl: '',
  });

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([getPromoCodes(), getPlans()])
      .then(([codes, plansList]) => {
        setList(codes);
        setPlans(Array.isArray(plansList) ? plansList : []);
      })
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

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.planId || !paymentForm.emailOrId) {
      setMessage('Укажите тариф и email или ID пользователя');
      return;
    }
    setSubmitting(true);
    setMessage(null);
    createPaymentLink({
      planId: paymentForm.planId,
      emailOrId: paymentForm.emailOrId,
      promoCodeId: paymentForm.promoCodeId || undefined,
      returnUrl: undefined,
      cancelUrl: undefined,
    })
      .then((res) => {
        setPaymentForm((prev) => ({ ...prev, confirmationUrl: res.confirmationUrl }));
        setMessage('Ссылка создана. Откройте в новой вкладке или скопируйте.');
      })
      .catch((e) => setMessage(e.response?.data?.message || 'Ошибка создания ссылки'))
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
          onClick={() => { setCreateOpen(true); setPaymentOpen(false); setMessage(null); }}
          className="px-4 py-2 bg-runa-orange text-white rounded-lg hover:bg-runa-orange-light font-medium"
        >
          Создать промокод
        </button>
        <button
          type="button"
          onClick={() => { setPaymentOpen(true); setCreateOpen(false); setMessage(null); setPaymentForm((p) => ({ ...p, confirmationUrl: '' })); }}
          className="px-4 py-2 border border-runa-orange text-runa-orange rounded-lg hover:bg-runa-orange/10 font-medium"
        >
          Создать платёж ЮKassa (с промокодом)
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
                onChange={(e) => setForm((f) => ({ ...f, discountRubles: parseInt(e.target.value, 10) || 0 }))}
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

      {paymentOpen && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6 max-w-md">
          <h3 className="font-medium text-gray-800 mb-4">Ссылка на оплату ЮKassa</h3>
          <form onSubmit={handleCreatePayment} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Тариф</label>
              <select
                value={paymentForm.planId}
                onChange={(e) => setPaymentForm((f) => ({ ...f, planId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Выберите тариф</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.description} — {p.price} ₽
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email или ID пользователя</label>
              <input
                type="text"
                value={paymentForm.emailOrId}
                onChange={(e) => setPaymentForm((f) => ({ ...f, emailOrId: e.target.value }))}
                placeholder="user@example.com или 12345"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Промокод (необязательно)</label>
              <select
                value={paymentForm.promoCodeId}
                onChange={(e) => setPaymentForm((f) => ({ ...f, promoCodeId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Без промокода</option>
                {list.filter((p) => new Date(p.validUntil) >= now).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} (−{p.discountRubles} ₽)
                  </option>
                ))}
              </select>
            </div>
            {paymentForm.confirmationUrl && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Ссылка на оплату</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={paymentForm.confirmationUrl}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm"
                  />
                  <a
                    href={paymentForm.confirmationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-runa-orange text-white rounded-lg text-sm whitespace-nowrap"
                  >
                    Открыть
                  </a>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-runa-orange text-white rounded-lg hover:bg-runa-orange-light disabled:opacity-50"
              >
                {submitting ? 'Создание…' : 'Получить ссылку'}
              </button>
              <button
                type="button"
                onClick={() => setPaymentOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                Закрыть
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
