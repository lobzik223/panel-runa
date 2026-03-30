import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { registerPanelAdmin, resendPanelVerification } from '@/lib/adminApi';
import styles from './LoginView.module.css';

const LOGO_SRC = '/seepromnt-logo.png';

export function RegisterView() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [errorText, setErrorText] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    if (password !== password2) {
      setErrorText('Пароли не совпадают.');
      return;
    }
    if (password.length < 10) {
      setErrorText('Пароль не короче 10 символов.');
      return;
    }
    setLoading(true);
    try {
      await registerPanelAdmin({ email: email.trim(), password, inviteCode: inviteCode.trim() });
      setDone(true);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setErrorText('');
    try {
      await resendPanelVerification(email.trim());
      setErrorText('Если email есть в системе, письмо отправлено.');
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : String(err));
    } finally {
      setResendLoading(false);
    }
  };

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

        {done ? (
          <div className={styles.form}>
            <p className={isDark ? styles.labelDark : styles.label} style={{ textAlign: 'center', lineHeight: 1.5 }}>
              Аккаунт создан. Проверьте почту <strong>{email}</strong> и перейдите по ссылке для подтверждения.
            </p>
            <button
              type="button"
              className={styles.enterBtn}
              onClick={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? 'Отправка…' : 'Отправить письмо ещё раз'}
            </button>
            {errorText ? <p className={styles.errorHint}>{errorText}</p> : null}
            <p className={styles.footerLink}>
              <Link to="/">На страницу входа</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="reg-email" className={`${styles.label} ${isDark ? styles.labelDark : ''}`}>
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${styles.input} ${isDark ? styles.inputDark : ''}`}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="reg-invite" className={`${styles.label} ${isDark ? styles.labelDark : ''}`}>
                Код приглашения
              </label>
              <input
                id="reg-invite"
                type="password"
                autoComplete="off"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className={`${styles.input} ${isDark ? styles.inputDark : ''}`}
                required
                minLength={8}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="reg-pass" className={`${styles.label} ${isDark ? styles.labelDark : ''}`}>
                Пароль (от 10 символов)
              </label>
              <input
                id="reg-pass"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${styles.input} ${isDark ? styles.inputDark : ''}`}
                required
                minLength={10}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="reg-pass2" className={`${styles.label} ${isDark ? styles.labelDark : ''}`}>
                Пароль ещё раз
              </label>
              <input
                id="reg-pass2"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className={`${styles.input} ${isDark ? styles.inputDark : ''}`}
                required
                minLength={10}
              />
            </div>
            {errorText ? (
              <p className={styles.errorHint} role="alert">
                {errorText}
              </p>
            ) : null}
            <button type="submit" className={styles.enterBtn} disabled={loading}>
              {loading ? 'Регистрация…' : 'Зарегистрироваться'}
            </button>
            <p className={styles.footerLink}>
              <Link to="/">Уже есть аккаунт — войти</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
