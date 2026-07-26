import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './Section.module.css';
import s from './ReferralCreatePage.module.css';
import {
  createPromoCode,
  deletePromoCode,
  fetchPromoCodes,
  formatDateRu,
  formatDateTimeRu,
  type PromoCodeDto,
} from '@/lib/adminApi';

function suggestCode(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-ZА-Я0-9]+/gi, '')
    .slice(0, 10);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RUNA${base || 'PROMO'}${suffix}`.slice(0, 32);
}

function defaultValidUntil(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().slice(0, 10);
}

export function ReferralCreatePage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const dk = isDark ? ` ${s.dk}` : '';

  const [list, setList] = useState<PromoCodeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'RUB' | 'PERCENT'>('RUB');
  const [discountValue, setDiscountValue] = useState(50);
  const [validUntil, setValidUntil] = useState(defaultValidUntil);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setList(await fetchPromoCodes());
    } catch (e) {
      setError((e as Error).message);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const finalCode = (code.trim() || suggestCode(name)).toUpperCase();
      await createPromoCode({
        code: finalCode,
        name: name.trim() || finalCode,
        discountType,
        discountValue: Math.floor(Number(discountValue) || 0),
        validUntil: new Date(`${validUntil}T23:59:59.000Z`).toISOString(),
      });
      setName('');
      setCode('');
      setDiscountValue(50);
      setValidUntil(defaultValidUntil());
      await load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string, promoCode: string) => {
    if (!window.confirm(`Удалить промокод ${promoCode}?`)) return;
    try {
      await deletePromoCode(id);
      await load();
    } catch (err) {
      window.alert((err as Error).message);
    }
  };

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Промокоды ЮKassa</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Коды для оплаты подписки на сайте. Скидка применяется при создании платежа в backend-runa.
      </p>

      <div className={`${s.grid}${dk}`}>
        <form className={`${s.form}${dk}`} onSubmit={(e) => void onCreate(e)}>
          <h2 className={s.formTitle}>Создать промокод</h2>

          <label className={s.label}>
            Название (источник / кампания)
            <input
              className={s.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="YouTube блогер"
              required
            />
          </label>

          <label className={s.label}>
            Код
            <div className={s.codeRow}>
              <input
                className={s.input}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Сгенерируется сам"
              />
              <button
                type="button"
                className={s.secondaryBtn}
                onClick={() => setCode(suggestCode(name))}
              >
                Сгенерировать
              </button>
            </div>
          </label>

          <div className={s.row2}>
            <label className={s.label}>
              Тип скидки
              <select
                className={s.input}
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'RUB' | 'PERCENT')}
              >
                <option value="RUB">Рубли</option>
                <option value="PERCENT">Процент</option>
              </select>
            </label>
            <label className={s.label}>
              Значение
              <input
                className={s.input}
                type="number"
                min={0}
                max={discountType === 'PERCENT' ? 100 : 100000}
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <label className={s.label}>
            Действует до
            <input
              className={s.input}
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              required
            />
          </label>

          {formError ? <p className={s.error}>{formError}</p> : null}

          <button className={s.primaryBtn} type="submit" disabled={submitting}>
            {submitting ? 'Создание…' : 'Создать промокод'}
          </button>
        </form>

        <div className={`${s.listPanel}${dk}`}>
          <h2 className={s.formTitle}>Список</h2>
          {error ? <p className={s.error}>{error}</p> : null}
          {loading ? <p className={s.muted}>Загрузка…</p> : null}
          {!loading && list.length === 0 ? <p className={s.muted}>Пока нет промокодов</p> : null}
          <ul className={s.list}>
            {list.map((p) => (
              <li key={p.id} className={s.item}>
                <div>
                  <div className={s.code}>{p.code}</div>
                  <div className={s.meta}>
                    {p.name} · скидка{' '}
                    {p.discountType === 'PERCENT' ? `${p.discountValue}%` : `${p.discountValue} ₽`} ·
                    до {formatDateRu(p.validUntil)} · оплат: {p.paymentsCount}
                  </div>
                  <div className={s.meta}>создан {formatDateTimeRu(p.createdAt)}</div>
                </div>
                <button type="button" className={s.dangerBtn} onClick={() => void onDelete(p.id, p.code)}>
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
