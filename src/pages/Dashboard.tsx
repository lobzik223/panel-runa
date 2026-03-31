import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import {
  IconHome,
  IconUsers,
  IconReferral,
  IconDocs,
  IconServer,
  IconRules,
  IconStats,
  IconLink,
  IconLogout,
  IconSun,
  IconMoon,
} from '@/components/Icons';
import { MainPage } from '@/sections/MainPage';
import { UsersPage } from '@/sections/UsersPage';
import { ReferralCreatePage } from '@/sections/ReferralCreatePage';
import { DocsPage } from '@/sections/DocsPage';
import { ServerPage } from '@/sections/ServerPage';
import { RulesPage } from '@/sections/RulesPage';
import { ReferralStatsPage } from '@/sections/ReferralStatsPage';
import { DataLinksPage } from '@/sections/DataLinksPage';
import {
  formatAdminRoleRu,
  getAdminDisplayName,
  getAdminRole,
  getAdminToken,
  setAdminToken,
  fetchAdminProfile,
} from '@/lib/adminApi';
import s from './Dashboard.module.css';

const LOGO_SRC = '/seepromnt-logo.png';

const NAV_ITEMS: { to: string; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { to: '/panel', label: 'Главная', Icon: IconHome },
  { to: '/panel/users', label: 'Пользователи', Icon: IconUsers },
  { to: '/panel/referral-create', label: 'Реферальная система', Icon: IconReferral },
  { to: '/panel/docs', label: 'Заблокированные', Icon: IconDocs },
  { to: '/panel/server', label: 'Серверная часть', Icon: IconServer },
  { to: '/panel/rules', label: 'Правила панели', Icon: IconRules },
  { to: '/panel/referral-stats', label: 'Статистика', Icon: IconStats },
  { to: '/panel/data-links', label: 'Графики и данные', Icon: IconLink },
];

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
  return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getGreeting(d: Date) {
  const h = d.getHours();
  if (h < 6) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

const PAGE_TITLES: Record<string, string> = {
  '/panel': 'Обзор',
  '/panel/users': 'Пользователи',
  '/panel/referral-create': 'Реферальная система',
  '/panel/docs': 'Заблокированные',
  '/panel/server': 'Серверная часть',
  '/panel/rules': 'Правила панели',
  '/panel/referral-stats': 'Статистика',
  '/panel/data-links': 'Графики и данные',
};

const IDLE_MS = 4 * 60 * 1000;

export function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const now = useClock();
  const [adminLabel, setAdminLabel] = useState(() => getAdminDisplayName() || 'Администратор');

  useEffect(() => {
    const jwt = getAdminToken()?.trim();
    const devKey = import.meta.env.VITE_ADMIN_API_KEY?.trim();
    if (!jwt && !devKey) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    const jwt = getAdminToken()?.trim();
    const devKey = import.meta.env.VITE_ADMIN_API_KEY?.trim();
    if (!jwt && devKey) return;
    if (!jwt) return;
    void (async () => {
      const profile = await fetchAdminProfile();
      if (cancelled) return;
      if (!profile) {
        navigate('/', { replace: true });
        return;
      }
      if (profile.name?.trim()) {
        setAdminLabel(profile.name.trim());
      }
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
      }, IDLE_MS);
    };
    reset();
    const events: (keyof WindowEventMap)[] = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];
    events.forEach((ev) => globalThis.addEventListener(ev, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((ev) => globalThis.removeEventListener(ev, reset));
    };
  }, [navigate]);

  const handleLogout = () => {
    setAdminToken(null);
    navigate('/');
  };
  const pageTitle = PAGE_TITLES[location.pathname] || 'Панель';
  const adminRoleLabel = formatAdminRoleRu(getAdminRole());

  return (
    <div className={`${s.layout} ${isDark ? s.dark : ''}`}>
      {/* ───── SIDEBAR ───── */}
      <aside className={s.sidebar}>
        <div className={s.sidebarInner}>
          {/* Logo */}
          <div className={s.logoBlock}>
            <div className={s.logoGlow} />
            <img src={LOGO_SRC} alt="Seepromnt" className={s.logo} />
          </div>

          {/* Nav */}
          <nav className={s.nav}>
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/panel'}
                className={({ isActive }: { isActive: boolean }) =>
                  `${s.navItem} ${isActive ? s.navActive : ''}`
                }
              >
                <span className={s.navDot} />
                <span className={s.navIcon}>
                  <Icon className={s.navSvg} />
                </span>
                <span className={s.navLabel}>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className={s.sidebarFoot}>
            {/* Theme */}
            <div className={s.themeSwitch}>
              <button
                className={`${s.themeBtn} ${!isDark ? s.themeBtnOn : ''}`}
                onClick={() => setTheme('light')}
              >
                <IconSun className={s.themeSvg} />
              </button>
              <button
                className={`${s.themeBtn} ${isDark ? s.themeBtnOn : ''}`}
                onClick={() => setTheme('dark')}
              >
                <IconMoon className={s.themeSvg} />
              </button>
            </div>

            {/* Admin profile */}
            <div className={s.adminCard}>
              <div className={s.adminAvatar}>
                <span>{adminLabel.charAt(0).toUpperCase()}</span>
              </div>
              <div className={s.adminInfo}>
                <span className={s.adminName}>{adminLabel}</span>
                <span className={s.adminRole}>{adminRoleLabel}</span>
              </div>
            </div>

            <button className={s.logoutBtn} onClick={handleLogout}>
              <IconLogout className={s.logoutSvg} />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ───── MAIN ───── */}
      <main className={s.main}>
        <header className={s.topBar}>
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
            <Route path="docs" element={<DocsPage />} />
            <Route path="server" element={<ServerPage />} />
            <Route path="rules" element={<RulesPage />} />
            <Route path="referral-stats" element={<ReferralStatsPage />} />
            <Route path="data-links" element={<DataLinksPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
