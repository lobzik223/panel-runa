import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './Section.module.css';
import s from './SettingsPage.module.css';
import { changeAdminPassword, fetchAdminProfile, type AdminProfileDto } from '@/lib/adminApi';

export function SettingsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [profile, setProfile] = useState<AdminProfileDto | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchAdminProfile().then(setProfile);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (newPassword.length < 8) {
      setErr('Новый пароль — минимум 8 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr('Пароли не совпадают');
      return;
    }
    setBusy(true);
    try {
      await changeAdminPassword(currentPassword, newPassword);
      setMsg('Пароль обновлён');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.section}>
      <h1 className={`${styles.title} ${isDark ? styles.titleDark : ''}`}>Настройки</h1>
      <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
        Профиль администратора и смена пароля.
      </p>

      <div className={`${s.card} ${isDark ? s.cardDark : ''}`}>
        <h2 className={s.h2}>Аккаунт</h2>
        <p className={s.line}>
          <strong>Имя:</strong> {profile?.name || '—'}
        </p>
        <p className={s.line}>
          <strong>Email:</strong> {profile?.email || '—'}
        </p>
        <p className={s.line}>
          <strong>Роль:</strong> Админ
        </p>
      </div>

      <form className={`${s.card} ${isDark ? s.cardDark : ''}`} onSubmit={(e) => void onSubmit(e)}>
        <h2 className={s.h2}>Сменить пароль</h2>
        <label className={s.label}>
          Текущий пароль
          <input
            className={s.input}
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label className={s.label}>
          Новый пароль
          <input
            className={s.input}
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label className={s.label}>
          Повтор нового пароля
          <input
            className={s.input}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        {err ? <p className={s.error}>{err}</p> : null}
        {msg ? <p className={s.ok}>{msg}</p> : null}
        <button className={s.btn} type="submit" disabled={busy}>
          {busy ? 'Сохранение…' : 'Сохранить пароль'}
        </button>
      </form>
    </section>
  );
}
