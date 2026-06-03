import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  deletePanelAccount,
  fetchAdminProfile,
  fetchPanelAccounts,
  formatAdminRoleRu,
  patchPanelAccountRole,
  type PanelAccountDto,
} from '@/lib/adminApi';
import styles from './Section.module.css';
import fc from './finance/Finance.module.css';
import sp from './SettingsPage.module.css';

const ROLE_OPTIONS: Array<{ value: 'admin' | 'finance_analyst'; label: string }> = [
  { value: 'admin', label: 'Администратор' },
  { value: 'finance_analyst', label: 'Финансовый аналитик' },
];

export function PanelRolesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [myId, setMyId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<PanelAccountDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profile, data] = await Promise.all([fetchAdminProfile(), fetchPanelAccounts()]);
      setMyId(profile?.id ?? null);
      setAccounts(data.accounts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRoleChange = async (id: string, role: 'admin' | 'finance_analyst') => {
    setBusyId(id);
    setError(null);
    try {
      await patchPanelAccountRole(id, role);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (acc: PanelAccountDto) => {
    if (!window.confirm(`Удалить аккаунт ${acc.email}? Это действие необратимо.`)) return;
    setBusyId(acc.id);
    setError(null);
    try {
      await deletePanelAccount(acc.id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const isSuperadmin = (role: string) => {
    const r = role.toLowerCase();
    return r === 'superadmin' || r === 'super_admin';
  };

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Роли панели</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Учётные записи с доступом в админ-панель. Финансового аналитика нельзя повысить до администратора здесь — только
        через VPS:{' '}
        <code className={sp.code}>node dist/cli/promote-panel-admin.js --email=… --role=admin</code>. Главного
        администратора назначает только консоль с ролью superadmin.
      </p>

      {error ? (
        <p className={`${fc.alertError} ${isDark ? fc.alertErrorDark : ''}`} role="alert">
          {error}
        </p>
      ) : null}

      <div className={`${styles.tableWrap} ${isDark ? styles.tableWrapDark : ''}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Имя</th>
              <th>Email</th>
              <th>Роль</th>
              <th>Создан</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>Загрузка…</td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={5}>Нет аккаунтов</td>
              </tr>
            ) : (
              accounts.map((acc) => {
                const isSelf = myId === acc.id;
                const superRow = isSuperadmin(acc.role);
                return (
                  <tr key={acc.id}>
                    <td>{acc.name || '—'}</td>
                    <td>
                      {acc.email}
                      {isSelf ? (
                        <span className={`${sp.youBadge} ${isDark ? sp.youBadgeDark : ''}`}> (вы)</span>
                      ) : null}
                    </td>
                    <td>
                      {superRow ? (
                        <span title="Смена только через VPS (promote-panel-admin)">
                          {formatAdminRoleRu(acc.role)}
                        </span>
                      ) : (
                        <select
                          className={`${fc.periodSelect} ${isDark ? fc.periodSelectDark : ''}`}
                          value={
                            acc.role === 'finance_analyst' ? 'finance_analyst' : 'admin'
                          }
                          disabled={busyId === acc.id || isSelf}
                          onChange={(e) =>
                            void handleRoleChange(
                              acc.id,
                              e.target.value as 'admin' | 'finance_analyst'
                            )
                          }
                        >
                          {ROLE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {acc.role === 'finance_analyst' ? (
                        <p className={`${sp.rowHint} ${isDark ? sp.rowHintDark : ''}`}>
                          Повышение — только VPS
                        </p>
                      ) : null}
                    </td>
                    <td>{new Date(acc.createdAt).toLocaleDateString('ru-RU')}</td>
                    <td>
                      {!isSelf ? (
                        <button
                          type="button"
                          className={fc.linkBtnDanger}
                          disabled={busyId === acc.id}
                          onClick={() => void handleDelete(acc)}
                        >
                          {busyId === acc.id ? '…' : 'Удалить'}
                        </button>
                      ) : (
                        <span className={`${sp.rowHint} ${isDark ? sp.rowHintDark : ''}`}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
