import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './Section.module.css';
import s from './UsersPage.module.css';
import { type AdminUserDto, fetchBlockedUsers, patchAdminUser } from '@/lib/adminApi';

function formatDateTimeRu(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function DocsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const dk = isDark ? ' ' + s.dk : '';

  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchBlockedUsers();
      setUsers(r.users);
    } catch (e) {
      setUsers([]);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unblock = async (userId: string) => {
    if (!window.confirm('Разблокировать квоты этого пользователя? Он снова появится в разделе «Пользователи» как активный.')) return;
    setBusyId(userId);
    setError(null);
    try {
      await patchAdminUser(userId, { freeQuotaSuspended: false });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Заблокированные</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Пользователи с заблокированными квотами. Причина задаётся при блокировке в разделе «Пользователи». После разблокировки аккаунт снова в общем списке.
      </p>

      {error ? (
        <p className={`${s.inlineError}${dk}`} role="alert">
          {error}
        </p>
      ) : null}

      <div className={`${styles.tableWrap} ${isDark ? styles.tableWrapDark : ''}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Email</th>
              <th>Причина блокировки</th>
              <th>Обновлено</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={s.emptyCell}>
                  Загрузка…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className={s.emptyCell}>
                  Нет заблокированных пользователей.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={s.userCell}>
                      <div className={`${s.avatarSmall}${dk}`}>
                        <span>{(u.name || u.email || '?')[0].toUpperCase()}</span>
                      </div>
                      <div className={`${s.userName}${dk}`}>{u.name || '—'}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`${s.userEmail}${dk}`}>{u.email}</span>
                  </td>
                  <td>
                    <span className={`${s.reasonCell}${dk}`}>{u.adminBlockReason?.trim() || '—'}</span>
                  </td>
                  <td>{formatDateTimeRu(u.updatedAt)}</td>
                  <td>
                    <button
                      type="button"
                      className={`${s.actionBtn} ${s.actionBtnGreen}`}
                      style={{ padding: '8px 14px', fontSize: 13 }}
                      disabled={busyId === u.id}
                      onClick={() => void unblock(u.id)}
                    >
                      {busyId === u.id ? '…' : 'Разблокировать'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
