import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  changePanelPassword,
  fetchAdminProfile,
  fetchMyPanelLogins,
  formatAdminRoleRu,
  type PanelLoginEventDto,
} from '@/lib/adminApi';
import styles from './Section.module.css';
import fc from './finance/Finance.module.css';
import sp from './SettingsPage.module.css';

function loginMethodRu(m: string): string {
  if (m === 'trusted') return 'Доверенное устройство';
  if (m === 'otp') return 'Код из письма';
  return m;
}

function shortenUa(ua: string): string {
  if (ua.length <= 72) return ua || '—';
  return `${ua.slice(0, 69)}…`;
}

export function SettingsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [profileEmail, setProfileEmail] = useState('');
  const [profileRole, setProfileRole] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  const [logins, setLogins] = useState<PanelLoginEventDto[]>([]);
  const [loginsLoading, setLoginsLoading] = useState(true);
  const [loginsErr, setLoginsErr] = useState<string | null>(null);

  useEffect(() => {
    void fetchAdminProfile().then((p) => {
      if (p?.email) setProfileEmail(p.email);
      if (p?.role) setProfileRole(p.role);
    });
  }, []);

  const loadLogins = useCallback(async () => {
    setLoginsLoading(true);
    setLoginsErr(null);
    try {
      const r = await fetchMyPanelLogins();
      setLogins(r.logins);
    } catch (e) {
      setLoginsErr((e as Error).message);
      setLogins([]);
    } finally {
      setLoginsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogins();
  }, [loadLogins]);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordErr(null);
    if (newPassword.length < 10) {
      setPasswordErr('Новый пароль — не короче 10 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErr('Повтор пароля не совпадает');
      return;
    }
    setSaving(true);
    try {
      await changePanelPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg('Пароль обновлён');
    } catch (err) {
      setPasswordErr((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Настройки</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Смена пароля и журнал ваших входов в панель за сегодня (до 25 записей, UTC).
      </p>

      <div className={`${fc.toolbar} ${isDark ? fc.toolbarDark : ''} ${sp.card}`}>
        <h2 className={`${sp.cardTitle} ${isDark ? sp.cardTitleDark : ''}`}>Аккаунт</h2>
        <p className={`${sp.metaLine} ${isDark ? sp.metaLineDark : ''}`}>
          Email: <strong>{profileEmail || '—'}</strong>
        </p>
        <p className={`${sp.metaLine} ${isDark ? sp.metaLineDark : ''}`}>
          Роль: <strong>{formatAdminRoleRu(profileRole)}</strong>
        </p>
      </div>

      <div className={`${fc.toolbar} ${isDark ? fc.toolbarDark : ''} ${sp.card}`}>
        <h2 className={`${sp.cardTitle} ${isDark ? sp.cardTitleDark : ''}`}>Сменить пароль</h2>
        <p className={`${sp.hint} ${isDark ? sp.hintDark : ''}`}>
          Укажите текущий пароль — без него смена не выполняется.
        </p>
        <form className={sp.form} onSubmit={(e) => void handlePassword(e)}>
          <label className={sp.label}>
            <span>Текущий пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={`${sp.input} ${isDark ? sp.inputDark : ''}`}
              required
            />
          </label>
          <label className={sp.label}>
            <span>Новый пароль</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`${sp.input} ${isDark ? sp.inputDark : ''}`}
              minLength={10}
              required
            />
          </label>
          <label className={sp.label}>
            <span>Повтор нового пароля</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${sp.input} ${isDark ? sp.inputDark : ''}`}
              minLength={10}
              required
            />
          </label>
          {passwordErr ? (
            <p className={`${fc.alertError} ${isDark ? fc.alertErrorDark : ''}`} role="alert">
              {passwordErr}
            </p>
          ) : null}
          {passwordMsg ? (
            <p className={`${sp.okMsg} ${isDark ? sp.okMsgDark : ''}`}>{passwordMsg}</p>
          ) : null}
          <button type="submit" className={fc.primaryBtn} disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить пароль'}
          </button>
        </form>
      </div>

      <div className={`${styles.tableWrap} ${isDark ? styles.tableWrapDark : ''}`}>
        <div className={sp.tableHead}>
          <h2 className={`${sp.cardTitle} ${isDark ? sp.cardTitleDark : ''}`}>Входы за сегодня</h2>
          <button type="button" className={fc.ghostBtn} onClick={() => void loadLogins()}>
            Обновить
          </button>
        </div>
        {loginsErr ? (
          <p className={`${fc.alertError} ${isDark ? fc.alertErrorDark : ''}`} role="alert">
            {loginsErr}
          </p>
        ) : null}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Время</th>
              <th>IP</th>
              <th>Регион</th>
              <th>Способ</th>
              <th>Браузер</th>
            </tr>
          </thead>
          <tbody>
            {loginsLoading ? (
              <tr>
                <td colSpan={5}>Загрузка…</td>
              </tr>
            ) : logins.length === 0 ? (
              <tr>
                <td colSpan={5}>Сегодня успешных входов пока нет.</td>
              </tr>
            ) : (
              logins.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.createdAt).toLocaleString('ru-RU')}</td>
                  <td>{l.ip || '—'}</td>
                  <td>{l.countryCode || '—'}</td>
                  <td>{loginMethodRu(l.loginMethod)}</td>
                  <td className={sp.uaCell}>{shortenUa(l.userAgent)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
