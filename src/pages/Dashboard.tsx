import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import {
  IconHome,
  IconUsers,
  IconReferral,
  IconDocs,
  IconStats,
  IconSettings,
  IconLogout,
  IconSun,
  IconMoon,
  IconMenu,
  IconClose,
} from '@/components/Icons';
import { MainPage } from '@/sections/MainPage';
import { UsersPage } from '@/sections/UsersPage';
import { ReferralCreatePage } from '@/sections/ReferralCreatePage';
import { DocsPage } from '@/sections/DocsPage';
import { ReferralStatsPage } from '@/sections/ReferralStatsPage';
import { SettingsPage } from '@/sections/SettingsPage';
import {
  formatAdminRoleRu,
  getAdminDisplayName,
  getAdminRole,
  getAdminToken,
  setAdminToken,
  fetchAdminProfile,
} from '@/lib/adminApi';
import s from './Dashboard.module.css';

const LOGO_SRC = '/runa-wordmark.svg';

type NavItem = { to: string; label: string; Icon: React.ComponentType<{ className?: string }> };

const NAV_ITEMS: NavItem[] = [
  { to: '/panel', label: 'Главная', Icon: IconHome },
  { to: '/panel/users', label: 'Пользователи', Icon: IconUsers },
  { to: '/panel/referral-create', label: 'Промокоды', Icon: IconReferral },
  { to: '/panel/referral-stats', label: 'Статистика промо', Icon: IconStats },
  { to: '/panel/docs', label: 'Заблокированные', Icon: IconDocs },
  { to: '/panel/settings', label: 'Настройки', Icon: IconSettings },
];

const PAGE_TITLES: Record<string, string> = {
  '/panel': 'Обзор',
  '/panel/users': 'Пользователи',
  '/panel/referral-create': 'Промокоды',
  '/panel/referral-stats': 'Статистика промо',
  '/panel/docs': 'Заблокированные',
  '/panel/settings': 'Настройки',
};

const ADMIN_IDLE_LOGOUT_MS = 20 * 60 * 1000;

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: Date) {
  return d.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getGreeting(d: Date) {
  const h = d.getHours();
  if (h < 6) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

export function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const now = useClock();
  const [adminLabel, setAdminLabel] = useState(() => getAdminDisplayName() || 'Админ');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!getAdminToken()?.trim()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    const jwt = getAdminToken()?.trim();
    if (!jwt) return;
    void (async () => {
      const profile = await fetchAdminProfile();
      if (cancelled) return;
      if (!profile) {
        setAdminToken(null);
        navigate('/', { replace: true });
        return;
      }
      if (profile.name?.trim()) setAdminLabel(profile.name.trim());
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setAdminToken(null);
        navigate('/', { replace: true });
      }, ADMIN_IDLE_LOGOUT_MS);
    };
    reset();
    const events: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'touchstart', 'click'];
    events.forEach((ev) => globalThis.addEventListener(ev, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((ev) => globalThis.removeEventListener(ev, reset));
    };
  }, [navigate]);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    closeMobileNav();
  }, [location.pathname, closeMobileNav]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  const pageTitle = PAGE_TITLES[location.pathname] || 'Панель';
  const adminRoleLabel = useMemo(() => formatAdminRoleRu(getAdminRole()), []);

  return (
    <div className={`${s.layout} ${isDark ? s.dark : ''}`}>
      {mobileNavOpen ? (
        <div className={s.navBackdrop} role="presentation" aria-hidden onClick={closeMobileNav} />
      ) : null}

      <aside className={`${s.sidebar} ${mobileNavOpen ? s.sidebarOpen : ''}`}>
        <div className={s.sidebarInner}>
          <div className={s.sidebarMobileHeader}>
            <span className={s.sidebarMobileTitle}>Меню</span>
            <button
              type="button"
              className={s.sidebarCloseBtn}
              onClick={closeMobileNav}
              aria-label="Закрыть меню"
            >
              <IconClose className={s.sidebarCloseSvg} />
            </button>
          </div>

          <div className={s.logoBlock}>
            <div className={s.logoGlow} />
            <img src={LOGO_SRC} alt="RUNA" className={s.logo} />
            <span className={s.logoCaption}>Admin</span>
          </div>

          <nav className={s.nav}>
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/panel'}
                className={({ isActive }: { isActive: boolean }) =>
                  `${s.navItem} ${isActive ? s.navActive : ''}`
                }
                onClick={closeMobileNav}
              >
                <span className={s.navDot} />
                <span className={s.navIcon}>
                  <Icon className={s.navSvg} />
                </span>
                <span className={s.navLabel}>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className={s.sidebarFoot}>
            <div className={s.themeSwitch}>
              <button
                className={`${s.themeBtn} ${!isDark ? s.themeBtnOn : ''}`}
                onClick={() => setTheme('light')}
                type="button"
              >
                <IconSun className={s.themeSvg} />
              </button>
              <button
                className={`${s.themeBtn} ${isDark ? s.themeBtnOn : ''}`}
                onClick={() => setTheme('dark')}
                type="button"
              >
                <IconMoon className={s.themeSvg} />
              </button>
            </div>

            <div className={s.adminCard}>
              <div className={s.adminAvatar}>
                <span>{adminLabel.charAt(0).toUpperCase()}</span>
              </div>
              <div className={s.adminInfo}>
                <span className={s.adminName}>{adminLabel}</span>
                <span className={s.adminRole}>{adminRoleLabel}</span>
              </div>
            </div>

            <button
              className={s.logoutBtn}
              type="button"
              onClick={() => {
                setAdminToken(null);
                navigate('/');
              }}
            >
              <IconLogout className={s.logoutSvg} />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </aside>

      <main className={s.main}>
        <header className={s.topBar}>
          <button
            type="button"
            className={s.menuBtn}
            aria-label="Открыть меню"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
          >
            <IconMenu className={s.menuIcon} />
          </button>
          <div className={s.topLeft}>
            <h1 className={s.pageTitle}>{pageTitle}</h1>
            <p className={s.pageGreeting}>
              {getGreeting(now)}, {adminLabel}
            </p>
          </div>
          <div className={s.topRight}>
            <div className={s.clockChip}>
              <span className={s.clockTime}>{formatTime(now)}</span>
              <span className={s.clockDate}>{formatDate(now)}</span>
            </div>
          </div>
        </header>

        <div className={s.content}>
          <Routes>
            <Route index element={<MainPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="referral-create" element={<ReferralCreatePage />} />
            <Route path="referral-stats" element={<ReferralStatsPage />} />
            <Route path="docs" element={<DocsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
