import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { deleteAdminWithToken } from '@/lib/adminApi';
import styles from './LoginView.module.css';

const LOGO_SRC = '/seepromnt-logo.png';

export function RevokeAdminPage() {
  const [searchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const token = useMemo(() => searchParams.get('t')?.trim() ?? '', [searchParams]);

  const [password, setPassword] = useState('');
  const [errorText, setErrorText] = useState('');
  const [infoText, setInfoText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setInfoText('');
    if (!token || token.length < 64) {
      setErrorText('Неверная или устаревшая ссылка. Откройте ссылку из письма целиком.');
      return;
    }
    if (!password) {
      setErrorText('Введите пароль учётной записи администратора.');
      return;
    }
    setLoading(true);
    try {
      await deleteAdminWithToken(token, password);
      setInfoText('Аккаунт администратора удалён. Это окно можно закрыть.');
      setPassword('');
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Не удалось выполнить удаление');
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
          <img src={LOGO_SRC} alt="Seepromnt" className={styles.logo} width={140} height={140} />
        </div>
        <h1 className={`${styles.pageTitle} ${isDark ? styles.pageTitleDark : ''}`}>Удаление аккаунта администратора</h1>
        <p className={`${styles.pageSubtitle} ${isDark ? styles.pageSubtitleDark : ''}`}>
          Ссылка из письма о входе в панель. Введите пароль этого аккаунта, чтобы подтвердить удаление. Последнего
          главного администратора (superadmin) удалить нельзя.
        </p>

        {!token ? (
          <p className={styles.errorHint}>Отсутствует параметр ссылки. Откройте полную ссылку из письма.</p>
        ) : infoText ? (
          <p className={styles.infoHint}>{infoText}</p>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="revoke-password" className={`${styles.label} ${isDark ? styles.labelDark : ''}`}>
                Пароль администратора
              </label>
              <input
                id="revoke-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${styles.input} ${isDark ? styles.inputDark : ''}`}
                required
              />
            </div>
            {errorText ? (
              <p className={styles.errorHint} role="alert">
                {errorText}
              </p>
            ) : null}
            <button type="submit" className={styles.enterBtn} disabled={loading}>
              {loading ? 'Удаление…' : 'Удалить аккаунт навсегда'}
            </button>
            <p className={`${styles.pageSubtitle} ${isDark ? styles.pageSubtitleDark : ''}`} style={{ marginTop: 12 }}>
              <Link to="/" style={{ color: 'inherit', fontWeight: 600 }}>
                На страницу входа
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
