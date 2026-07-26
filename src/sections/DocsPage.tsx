import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './Section.module.css';
import s from './DocsPage.module.css';
import {
  type AdminUserListItem,
  fetchAdminUsers,
  formatDateTimeRu,
  formatIntRu,
  unblockAdminUser,
} from '@/lib/adminApi';

export function DocsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUsers({ blockedOnly: true, page: 1, limit: 500 });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onUnblock = async (id: number) => {
    const password = window.prompt('Пароль админа для разблокировки:');
    if (password == null) return;
    if (!password.trim()) {
      window.alert('Пароль обязателен');
      return;
    }
    setBusyId(id);
    try {
      await unblockAdminUser(id, password.trim());
      await load();
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Заблокированные</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Пользователи с активной блокировкой: {loading ? '…' : formatIntRu(total)}
      </p>

      {error ? <p className={s.error}>{error}</p> : null}

      <div className={`${s.tableWrap} ${isDark ? s.tableWrapDark : ''}`}>
        {loading ? <p className={s.muted}>Загрузка…</p> : null}
        {!loading && items.length === 0 ? <p className={s.muted}>Нет заблокированных</p> : null}
        {items.map((u) => (
          <div key={u.id} className={`${s.row} ${isDark ? s.rowDark : ''}`}>
            <div>
              <div className={s.name}>{u.name || 'Без имени'}</div>
              <div className={s.meta}>
                #{u.id} · {u.email || '—'}
              </div>
              <div className={s.meta}>
                до {formatDateTimeRu(u.blockedUntil)} · {u.blockReason || 'без причины'}
              </div>
            </div>
            <button
              type="button"
              className={s.btn}
              disabled={busyId === u.id}
              onClick={() => void onUnblock(u.id)}
            >
              Разблокировать
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
