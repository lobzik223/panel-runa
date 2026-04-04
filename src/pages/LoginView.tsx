import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import {
  requestPanelLogin,
  verifyPanelLoginOtp,
  resendPanelLoginOtp,
  abandonPanelLoginChallenge,
} from '@/lib/adminApi';
import styles from './LoginView.module.css';

const LOGO_SRC = '/seepromnt-logo.png';

/** Fallback, если сервер не прислал resendCooldownSeconds (5 мин в panel-admin-login). */
const PANEL_OTP_RESEND_SEC_FALLBACK = 300;

function formatResendCooldown(totalSec: number): string {
  if (totalSec <= 0) return '';
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

type Step = 'credentials' | 'otp';

export function LoginView() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [emailMask, setEmailMask] = useState('');
  const [errorText, setErrorText] = useState('');
  const [infoText, setInfoText] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSec, setResendSec] = useState(0);
  const [emailVerificationPending, setEmailVerificationPending] = useState(false);

  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setInterval(() => setResendSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendSec]);

  const goOtpStep = useCallback(
    (opts: {
      challengeId: string;
      emailMask: string;
      resendCooldownSeconds: number;
      emailVerificationPending: boolean;
    }) => {
      setChallengeId(opts.challengeId);
      setEmailMask(opts.emailMask);
      setStep('otp');
      setOtp('');
      setErrorText('');
      setInfoText('');
      setResendSec(opts.resendCooldownSeconds);
      setEmailVerificationPending(opts.emailVerificationPending);
    },
    [],
  );

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setInfoText('');
    setLoading(true);
    try {
      const r = await requestPanelLogin(email.trim(), password);
      if (!r.requiresOtp) {
        navigate('/panel');
        return;
      }
      goOtpStep({
        challengeId: r.challengeId,
        emailMask: r.emailMask,
        resendCooldownSeconds: r.resendCooldownSeconds,
        emailVerificationPending: r.emailVerificationPending,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('PANEL_LOGIN_IP_LOCKED:')) {
        const sec = msg.split(':')[1] ?? '900';
        setErrorText(`Слишком много неверных попыток пароля. Повторите через ${sec} с.`);
      } else if (msg.includes('SMTP') || msg.includes('почт')) {
        setErrorText(msg);
      } else {
        setErrorText(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId || otp.trim().length !== 6) {
      setErrorText('Введите 6-значный код из письма.');
      return;
    }
    setErrorText('');
    setInfoText('');
    setLoading(true);
    try {
      await verifyPanelLoginOtp({ challengeId, email: email.trim(), code: otp.trim() });
      navigate('/panel');
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Неверный код или сессия устарела.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!challengeId || resendSec > 0) return;
    setErrorText('');
    setInfoText('');
    setLoading(true);
    try {
      const r = await resendPanelLoginOtp(challengeId, email.trim());
      setResendSec(r.resendCooldownSeconds);
      setInfoText(`Код отправлен повторно. Действует ${Math.floor(r.expiresInSeconds / 60)} мин.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('COOLDOWN:')) {
        const sec = Number(msg.split(':')[1]) || PANEL_OTP_RESEND_SEC_FALLBACK;
        setResendSec(sec);
        setErrorText(`Повторная отправка возможна через ${formatResendCooldown(sec)}.`);
      } else {
        setErrorText(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    const cid = challengeId;
    const em = email.trim();
    if (cid && em) {
      try {
        await abandonPanelLoginChallenge(cid, em);
      } catch {
        /* сеть — всё равно сбрасываем UI */
      }
    }
    setStep('credentials');
    setChallengeId(null);
    setOtp('');
    setErrorText('');
    setInfoText('');
    setResendSec(0);
    setEmailVerificationPending(false);
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
          <img src={LOGO_SRC} alt="Seepromnt" className={styles.logo} width={160} height={160} />
        </div>

        <h1 className={`${styles.pageTitle} ${isDark ? styles.pageTitleDark : ''}`}>Авторизация администратора</h1>
        <p className={`${styles.pageSubtitle} ${isDark ? styles.pageSubtitleDark : ''}`}>
          {step === 'credentials'
            ? 'Вход только для учётных записей панели. Если вы уже подтверждали код с этого же устройства и сети в течение 24 часов — код может не потребоваться. Иначе на почту придёт отдельный код (не связан с регистрацией в приложении). Удаление аккаунта — только по ссылке в письме.'
            : emailVerificationPending
              ? `Код отправлен на ${emailMask}. Введите его, чтобы подтвердить владение почтой и войти. Если вернётесь назад без ввода кода, вход не считается подтверждённым — нужно запросить новый код. Повторная отправка — не чаще одного раза в 5 минут (таймер на кнопке).`
              : `Код отправлен на ${emailMask}. Повторная отправка — не чаще одного раза в 5 минут (таймер на кнопке).`}
        </p>

        {step === 'credentials' ? (
          <form onSubmit={handleCredentials} className={styles.form}>
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
            {infoText ? (
              <p className={styles.infoHint} role="status">
                {infoText}
              </p>
            ) : null}
            <button type="submit" className={styles.enterBtn} disabled={loading}>
              {loading ? 'Проверка…' : 'Далее — код на почту'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtp} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="login-otp" className={`${styles.label} ${isDark ? styles.labelDark : ''}`}>
                Код из письма
              </label>
              <input
                id="login-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`${styles.input} ${styles.otpInput} ${isDark ? styles.inputDark : ''}`}
                placeholder="000000"
                required
              />
            </div>
            {errorText ? (
              <p className={styles.errorHint} role="alert">
                {errorText}
              </p>
            ) : null}
            {infoText ? (
              <p className={styles.infoHint} role="status">
                {infoText}
              </p>
            ) : null}
            <button type="submit" className={styles.enterBtn} disabled={loading}>
              {loading ? 'Вход…' : 'Войти в панель'}
            </button>
            <div className={styles.otpActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={loading}
                onClick={() => void handleBackToLogin()}
              >
                Назад
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={loading || resendSec > 0}
                onClick={() => void handleResend()}
              >
                {resendSec > 0
                  ? `Отправить снова через ${formatResendCooldown(resendSec)}`
                  : 'Отправить код ещё раз'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
