import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { loginAdminWithTotp } from '@/lib/adminApi';
import styles from './LoginView.module.css';

const LOGO_SRC = '/seepromnt-logo.png';

export function LoginView() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const [adminKey, setAdminKey] = useState('');
  const [totp, setTotp] = useState('');
  const [errorText, setErrorText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    const key = adminKey.trim();
    const code = totp.trim();
    if (!key || key.length < 16) {
      setErrorText('Введите ключ панели (минимум 16 символов).');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setErrorText('Введите 6-значный код из приложения-аутентификатора.');
      return;
    }
    setLoading(true);
    try {
      await loginAdminWithTotp(key, code);
      navigate('/panel');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'ADMIN_2FA_DISABLED') {
        if (import.meta.env.VITE_ADMIN_API_KEY?.trim()) {
          navigate('/panel');
          return;
        }
        setErrorText('На бэкенде не включён 2FA. Для dev задайте VITE_ADMIN_API_KEY или включите ADMIN_TOTP_SECRET.');
        return;
      }
      setErrorText(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.wrap} ${isDark ? styles.wrapDark : ''}`}>
      <div className={styles.themeSwitchWrap}>
        <button
          type="button"
          className={`${styles.themeBtn} ${!isDark ? styles.themeBtnActive : ''}`}
          onClick={() => setTheme('light')}
          aria-label="Светлая тема"
        >
          Светлая
        </button>
        <button
          type="button"
          className={`${styles.themeBtn} ${isDark ? styles.themeBtnActive : ''}`}
          onClick={() => setTheme('dark')}
          aria-label="Тёмная тема"
        >
          Тёмная
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <img
            src={LOGO_SRC}
            alt="Seepromnt"
            className={styles.logo}
          />
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="login-admin-key" className={`${styles.label} ${isDark ? styles.labelDark : ''}`}>
              Ключ панели
            </label>
            <input
              id="login-admin-key"
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="ADMIN_PANEL_SECRET"
              className={`${styles.input} ${isDark ? styles.inputDark : ''}`}
              required
              minLength={16}
              autoComplete="off"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="login-totp" className={`${styles.label} ${isDark ? styles.labelDark : ''}`}>
              Код 2FA (TOTP)
            </label>
            <input
              id="login-totp"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={totp}
              onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className={`${styles.input} ${isDark ? styles.inputDark : ''}`}
              required
              autoComplete="one-time-code"
            />
          </div>
          {errorText ? (
            <p className={styles.errorHint} role="alert">
              {errorText}
            </p>
          ) : null}
          <button type="submit" className={styles.enterBtn} disabled={loading}>
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
