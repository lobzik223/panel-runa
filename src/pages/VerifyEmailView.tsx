import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { verifyEmailFromToken } from '@/lib/adminApi';
import styles from './LoginView.module.css';

const LOGO_SRC = '/seepromnt-logo.png';

export function VerifyEmailView() {
  const [params] = useSearchParams();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const [status, setStatus] = useState<'loading' | 'ok' | 'err'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token')?.trim() ?? '';
    if (!token) {
      setStatus('err');
      setMessage('Нет токена в ссылке.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const msg = await verifyEmailFromToken(token);
        if (!cancelled) {
          setStatus('ok');
          setMessage(msg);
        }
      } catch (e) {
        if (!cancelled) {
          setStatus('err');
          setMessage(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <div className={`${styles.wrap} ${isDark ? styles.wrapDark : ''}`}>
      <div className={styles.themeSwitchWrap}>
        <button
          type="button"
          className={`${styles.themeBtn} ${!isDark ? styles.themeBtnActive : ''}`}
          onClick={() => setTheme('light')}
        >
          Светлая
        </button>
        <button
          type="button"
          className={`${styles.themeBtn} ${isDark ? styles.themeBtnActive : ''}`}
          onClick={() => setTheme('dark')}
        >
          Тёмная
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <img src={LOGO_SRC} alt="Seepromnt" className={styles.logo} />
        </div>
        <div className={styles.form}>
          {status === 'loading' ? (
            <p className={isDark ? styles.labelDark : styles.label}>Подтверждение email…</p>
          ) : null}
          {status === 'ok' ? (
            <>
              <p className={isDark ? styles.labelDark : styles.label} style={{ textAlign: 'center', lineHeight: 1.5 }}>
                {message}
              </p>
              <p className={styles.footerLink}>
                <Link to="/">Перейти ко входу</Link>
              </p>
            </>
          ) : null}
          {status === 'err' ? (
            <>
              <p className={styles.errorHint} role="alert">
                {message}
              </p>
              <p className={styles.footerLink}>
                <Link to="/">На страницу входа</Link>
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
