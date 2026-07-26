import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { loginAdmin } from '@/lib/adminApi';
import styles from './LoginView.module.css';

const LOGO_SRC = '/runa-wordmark.svg';

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
      await loginAdmin(email.trim(), password);
      navigate('/panel', { replace: true });
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.page} ${isDark ? styles.pageDark : ''}`}>
      <button
        type="button"
        className={styles.themeToggle}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label="Тема"
      >
        {isDark ? 'Светлая' : 'Тёмная'}
      </button>

      <div className={`${styles.card} ${isDark ? styles.cardDark : ''}`}>
        <img src={LOGO_SRC} alt="RUNA" className={styles.logo} />
        <h1 className={styles.title}>Панель RUNA</h1>
        <p className={`${styles.subtitle} ${isDark ? styles.subtitleDark : ''}`}>
          Вход для администратора
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Email
            <input
              className={`${styles.input} ${isDark ? styles.inputDark : ''}`}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className={styles.label}>
            Пароль
            <input
              className={`${styles.input} ${isDark ? styles.inputDark : ''}`}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>

          {errorText ? (
            <p className={styles.error} role="alert">
              {errorText}
            </p>
          ) : null}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
