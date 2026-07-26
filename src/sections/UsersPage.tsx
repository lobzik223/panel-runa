import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSearch } from '@/components/Icons';
import styles from './Section.module.css';
import s from './UsersPage.module.css';
import {
  type AdminUserDetail,
  type AdminUserListItem,
  blockAdminUser,
  fetchAdminUserDetail,
  fetchAdminUsers,
  formatDateRu,
  formatDateTimeRu,
  formatIntRu,
  grantUserSubscription,
  isUserBlocked,
  reduceUserSubscription,
  revokeUserSubscription,
  unblockAdminUser,
} from '@/lib/adminApi';

function confirmPassword(promptText: string): string | null {
  const p = window.prompt(promptText);
  if (p == null) return null;
  const t = p.trim();
  if (!t) {
    window.alert('Пароль обязателен');
    return null;
  }
  return t;
}

export function UsersPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const asId = /^\d+$/.test(q.trim()) ? Number(q.trim()) : undefined;
      const data = await fetchAdminUsers({
        search: asId ? undefined : q.trim() || undefined,
        userId: asId,
        page: 1,
        limit: 500,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  const openDetail = async (id: number) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      setDetail(await fetchAdminUserDetail(id));
    } catch (e) {
      window.alert((e as Error).message);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (selectedId == null) return;
    await openDetail(selectedId);
    await load();
  };

  const onBlock = async () => {
    if (!detail) return;
    const reason = window.prompt('Причина блокировки', detail.blockReason || 'Заблокировано администратором');
    if (reason == null) return;
    const password = confirmPassword('Введите свой пароль админа для подтверждения:');
    if (!password) return;
    setBusy(true);
    try {
      await blockAdminUser(detail.id, password, reason);
      await refreshDetail();
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onUnblock = async () => {
    if (!detail) return;
    const password = confirmPassword('Введите свой пароль админа для разблокировки:');
    if (!password) return;
    setBusy(true);
    try {
      await unblockAdminUser(detail.id, password);
      await refreshDetail();
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onGrant = async () => {
    if (!detail) return;
    const daysRaw = window.prompt('На сколько дней выдать Premium?', '30');
    if (daysRaw == null) return;
    const days = Math.max(1, parseInt(daysRaw, 10) || 30);
    const password = confirmPassword('Пароль админа для выдачи подписки:');
    if (!password) return;
    setBusy(true);
    try {
      await grantUserSubscription(detail.id, password, days);
      await refreshDetail();
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onReduce = async () => {
    if (!detail) return;
    const daysRaw = window.prompt('На сколько дней сократить Premium?', '1');
    if (daysRaw == null) return;
    const days = Math.max(1, parseInt(daysRaw, 10) || 1);
    const password = confirmPassword('Пароль админа для сокращения:');
    if (!password) return;
    setBusy(true);
    try {
      await reduceUserSubscription(detail.id, password, days);
      await refreshDetail();
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onRevoke = async () => {
    if (!detail) return;
    if (!window.confirm('Снять Premium у пользователя?')) return;
    const password = confirmPassword('Пароль админа для отзыва подписки:');
    if (!password) return;
    setBusy(true);
    try {
      await revokeUserSubscription(detail.id, password);
      await refreshDetail();
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Пользователи</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Поиск по email, имени или ID. Всего: {loading ? '…' : formatIntRu(total)}
      </p>

      <div className={s.searchRow}>
        <div className={`${s.searchBox} ${isDark ? s.searchBoxDark : ''}`}>
          <IconSearch className={s.searchIcon} />
          <input
            className={s.searchInput}
            placeholder="Email, имя или ID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button type="button" className={s.refreshBtn} onClick={() => void load()}>
          Обновить
        </button>
      </div>

      {error ? <p className={s.error}>{error}</p> : null}

      <div className={s.layout}>
        <div className={`${s.list} ${isDark ? s.listDark : ''}`}>
          {loading ? <p className={s.muted}>Загрузка…</p> : null}
          {!loading && items.length === 0 ? <p className={s.muted}>Ничего не найдено</p> : null}
          {items.map((u) => {
            const blocked = isUserBlocked(u);
            return (
              <button
                key={u.id}
                type="button"
                className={`${s.row} ${selectedId === u.id ? s.rowActive : ''} ${isDark ? s.rowDark : ''}`}
                onClick={() => void openDetail(u.id)}
              >
                <div className={s.rowMain}>
                  <span className={s.rowName}>{u.name || 'Без имени'}</span>
                  <span className={s.rowEmail}>{u.email || '—'}</span>
                </div>
                <div className={s.rowMeta}>
                  <span className={s.rowId}>#{u.id}</span>
                  <span className={blocked ? s.badgeBad : s.badgeOk}>
                    {blocked ? 'Блок' : u.premiumUntil ? 'Premium' : 'Free'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className={`${s.detail} ${isDark ? s.detailDark : ''}`}>
          {!selectedId ? (
            <p className={s.muted}>Выберите пользователя</p>
          ) : detailLoading || !detail ? (
            <p className={s.muted}>Загрузка…</p>
          ) : (
            <>
              <h2 className={s.detailTitle}>{detail.name || 'Без имени'}</h2>
              <dl className={s.dl}>
                <div>
                  <dt>ID</dt>
                  <dd>{detail.id}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{detail.email || '—'}</dd>
                </div>
                <div>
                  <dt>Телефон</dt>
                  <dd>{detail.phoneE164 || '—'}</dd>
                </div>
                <div>
                  <dt>Регистрация</dt>
                  <dd>{formatDateTimeRu(detail.createdAt)}</dd>
                </div>
                <div>
                  <dt>Premium до</dt>
                  <dd>{formatDateRu(detail.premiumUntil)}</dd>
                </div>
                <div>
                  <dt>Trial до</dt>
                  <dd>{formatDateRu(detail.trialUntil)}</dd>
                </div>
                <div>
                  <dt>Подписка</dt>
                  <dd>
                    {detail.subscription
                      ? `${detail.subscription.status} · ${detail.subscription.productId || '—'} · до ${formatDateRu(detail.subscription.currentPeriodEnd)}`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Блокировка</dt>
                  <dd>
                    {isUserBlocked(detail)
                      ? `до ${formatDateTimeRu(detail.blockedUntil)} · ${detail.blockReason || '—'}`
                      : 'нет'}
                  </dd>
                </div>
              </dl>

              <div className={s.actions}>
                {isUserBlocked(detail) ? (
                  <button type="button" disabled={busy} onClick={() => void onUnblock()}>
                    Разблокировать
                  </button>
                ) : (
                  <button type="button" disabled={busy} onClick={() => void onBlock()}>
                    Заблокировать
                  </button>
                )}
                <button type="button" disabled={busy} onClick={() => void onGrant()}>
                  + Premium
                </button>
                <button type="button" disabled={busy} onClick={() => void onReduce()}>
                  − дней
                </button>
                <button type="button" disabled={busy} onClick={() => void onRevoke()}>
                  Снять Premium
                </button>
              </div>

              {detail.subscriptionHistory?.length ? (
                <div className={s.history}>
                  <h3>История подписки</h3>
                  <ul>
                    {detail.subscriptionHistory.map((h, i) => (
                      <li key={`${h.createdAt}-${i}`}>
                        {formatDateTimeRu(h.createdAt)} — {h.action}
                        {h.details ? `: ${h.details}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
