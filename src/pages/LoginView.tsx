import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { loginPanelAdmin } from '@/lib/adminApi';
import styles from './LoginView.module.css';

const LOGO_SRC = '/seepromnt-logo.png';

export function LoginView() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorText, setErrorText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setLoading(true);
    try {
      await loginPanelAdmin(email.trim(), password);
      navigate('/panel');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('EMAIL_NOT_VERIFIED')) {
        setErrorText('Подтвердите email по ссылке из письма. Можно запросить повтор на странице регистрации.');
      } else {
        setErrorText(msg);
      }
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
          <img src={LOGO_SRC} alt="Seepromnt" className={styles.logo} />
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="login-email" className={`${styles.label} ${isDark ? styles.labelDark : ''}`}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${styles.input} ${isDark ? styles.inputDark : ''}`}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="login-password" className={`${styles.label} ${isDark ? styles.labelDark : ''}`}>
              Пароль
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${styles.input} ${isDark ? styles.inputDark : ''}`}
              required
              minLength={1}
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
          <p className={styles.footerLink}>
            <Link to="/register">Регистрация по коду приглашения</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
