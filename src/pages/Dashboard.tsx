import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
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
  IconReview,
  IconWallet,
  IconCpu,
  IconNote,
  IconFilePdf,
  IconSettings,
  IconShield,
  IconOrg,
  IconLogout,
  IconSun,
  IconMoon,
  IconMenu,
  IconClose,
} from '@/components/Icons';
import { MainPage } from '@/sections/MainPage';
import { UsersPage } from '@/sections/UsersPage';
import { OrganizationsPage } from '@/sections/OrganizationsPage';
import { ReferralCreatePage } from '@/sections/ReferralCreatePage';
import { DocsPage } from '@/sections/DocsPage';
import { ServerPage } from '@/sections/ServerPage';
import { RulesPage } from '@/sections/RulesPage';
import { ReferralStatsPage } from '@/sections/ReferralStatsPage';
import { DataLinksPage } from '@/sections/DataLinksPage';
import { ReviewsPage } from '@/sections/ReviewsPage';
import {
  formatAdminRoleRu,
  getAdminDisplayName,
  getAdminRole,
  getAdminToken,
  setAdminToken,
  fetchAdminProfile,
} from '@/lib/adminApi';
import { useAdminRole } from '@/hooks/useAdminRole';
import { FinancePaymentsPage } from '@/sections/finance/FinancePaymentsPage';
import { FinanceAiCostsPage } from '@/sections/finance/FinanceAiCostsPage';
import { FinanceAudiencePage } from '@/sections/finance/FinanceAudiencePage';
import { FinanceNotesPage } from '@/sections/finance/FinanceNotesPage';
import { FinanceReportsPage } from '@/sections/finance/FinanceReportsPage';
import { SettingsPage } from '@/sections/SettingsPage';
import { PanelRolesPage } from '@/sections/PanelRolesPage';
import s from './Dashboard.module.css';

const LOGO_SRC = '/seepromnt-logo.png';

type NavItem = { to: string; label: string; Icon: React.ComponentType<{ className?: string }>; sub?: boolean };

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: '/panel', label: 'Главная', Icon: IconHome },
  { to: '/panel/users', label: 'Пользователи', Icon: IconUsers },
  { to: '/panel/organizations', label: 'Организации', Icon: IconOrg },
  { to: '/panel/referral-create', label: 'Реферальная система', Icon: IconReferral },
  { to: '/panel/docs', label: 'Заблокированные', Icon: IconDocs },
  { to: '/panel/server', label: 'Серверная часть', Icon: IconServer },
  { to: '/panel/panel-roles', label: 'Роли', Icon: IconShield },
  { to: '/panel/rules', label: 'Правила панели', Icon: IconRules },
  { to: '/panel/settings', label: 'Настройки', Icon: IconSettings },
  { to: '/panel/referral-stats', label: 'Статистика', Icon: IconStats },
  { to: '/panel/data-links', label: 'Графики и данные', Icon: IconLink },
  { to: '/panel/reviews', label: 'Отзывы сайта', Icon: IconReview },
];

const FINANCE_NAV_ITEMS: NavItem[] = [
  { to: '/panel/finance/payments', label: 'Платежи', Icon: IconWallet, sub: true },
  { to: '/panel/finance/ai-costs', label: 'Расходы ИИ', Icon: IconCpu, sub: true },
  { to: '/panel/finance/audience', label: 'Аудитория', Icon: IconStats, sub: true },
  { to: '/panel/finance/notes', label: 'Заметки', Icon: IconNote, sub: true },
  { to: '/panel/finance/reports', label: 'Отчёты', Icon: IconFilePdf, sub: true },
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
  '/panel/organizations': 'Организации',
  '/panel/referral-create': 'Реферальная система',
  '/panel/docs': 'Заблокированные',
  '/panel/server': 'Серверная часть',
  '/panel/panel-roles': 'Роли',
  '/panel/rules': 'Правила панели',
  '/panel/settings': 'Настройки',
  '/panel/referral-stats': 'Статистика',
  '/panel/data-links': 'Графики и данные',
  '/panel/reviews': 'Отзывы сайта',
  '/panel/finance/payments': 'Платежи',
  '/panel/finance/ai-costs': 'Расходы ИИ',
  '/panel/finance/audience': 'Аудитория',
  '/panel/finance/notes': 'Заметки',
  '/panel/finance/reports': 'Отчёты',
};

/** Автовыход: только после простоя без действий пользователя (см. список событий ниже). */
const ADMIN_IDLE_LOGOUT_MS = 20 * 60 * 1000;

function NavItemsList({
  items,
  closeMobileNav,
}: {
  items: NavItem[];
  closeMobileNav: () => void;
}) {
  return (
    <>
      {items.map(({ to, label, Icon, sub }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/panel'}
          className={({ isActive }: { isActive: boolean }) =>
            `${s.navItem} ${sub ? s.navSubItem : ''} ${isActive ? s.navActive : ''}`
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
    </>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isFinanceAnalyst,
    canAccessFinance,
    canViewUsersPanel,
    canAccessServerPanel,
    canManagePanelAccounts,
  } = useAdminRole();
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
      }, ADMIN_IDLE_LOGOUT_MS);
    };
    reset();
    /** Только явные действия (клики/тап/клавиши); скролл не сбрасывает таймер — «ничего не нажимал». */
    const events: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'touchstart', 'click'];
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const FINANCE_ANALYST_NAV: NavItem[] = [
    { to: '/panel/users', label: 'Пользователи', Icon: IconUsers },
    { to: '/panel/organizations', label: 'Организации', Icon: IconOrg },
    { to: '/panel/referral-create', label: 'Реферальная система', Icon: IconReferral },
    { to: '/panel/docs', label: 'Заблокированные', Icon: IconDocs },
    { to: '/panel/rules', label: 'Правила панели', Icon: IconRules },
    { to: '/panel/referral-stats', label: 'Статистика', Icon: IconStats },
    { to: '/panel/data-links', label: 'Графики и данные', Icon: IconLink },
    { to: '/panel/reviews', label: 'Отзывы сайта', Icon: IconReview },
    { to: '/panel/settings', label: 'Настройки', Icon: IconSettings },
  ];

  const visibleAdminNav = useMemo(() => {
    if (isFinanceAnalyst) return FINANCE_ANALYST_NAV;
    return ADMIN_NAV_ITEMS.filter((item) => {
      if (item.to === '/panel/server') return canAccessServerPanel;
      if (item.to === '/panel/panel-roles') return canManagePanelAccounts;
      return true;
    });
  }, [isFinanceAnalyst, canAccessServerPanel, canManagePanelAccounts]);

  useEffect(() => {
    if (!isFinanceAnalyst) return;
    const p = location.pathname;
    const allowed =
      p.startsWith('/panel/finance') ||
      p === '/panel/users' ||
      p === '/panel/organizations' ||
      p === '/panel/referral-create' ||
      p === '/panel/docs' ||
      p === '/panel/rules' ||
      p === '/panel/referral-stats' ||
      p === '/panel/data-links' ||
      p === '/panel/reviews' ||
      p === '/panel/settings';
    if (!allowed) {
      navigate('/panel/finance/payments', { replace: true });
    }
  }, [isFinanceAnalyst, location.pathname, navigate]);

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

  return (
    <div className={`${s.layout} ${isDark ? s.dark : ''}`}>
      {mobileNavOpen ? (
        <div
          className={s.navBackdrop}
          role="presentation"
          aria-hidden
          onClick={closeMobileNav}
        />
      ) : null}

      {/* ───── SIDEBAR ───── */}
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

          {/* Logo */}
          <div className={s.logoBlock}>
            <div className={s.logoGlow} />
            <img src={LOGO_SRC} alt="Seepromnt" className={s.logo} />
          </div>

          {/* Nav */}
          <nav className={s.nav}>
            <NavItemsList items={visibleAdminNav} closeMobileNav={closeMobileNav} />
            {canAccessFinance ? (
              <>
                <div className={s.navGroupTitle}>Финансы</div>
                <NavItemsList items={FINANCE_NAV_ITEMS} closeMobileNav={closeMobileNav} />
              </>
            ) : null}
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
            <Route
              index
              element={
                isFinanceAnalyst ? <Navigate to="/panel/finance/payments" replace /> : <MainPage />
              }
            />
            {canViewUsersPanel ? <Route path="users" element={<UsersPage />} /> : null}
            {canViewUsersPanel ? <Route path="organizations" element={<OrganizationsPage />} /> : null}
            {canViewUsersPanel || isFinanceAnalyst ? (
              <>
                <Route path="referral-create" element={<ReferralCreatePage />} />
                <Route path="docs" element={<DocsPage />} />
                <Route path="rules" element={<RulesPage />} />
                <Route path="referral-stats" element={<ReferralStatsPage />} />
                <Route path="data-links" element={<DataLinksPage />} />
                <Route path="reviews" element={<ReviewsPage />} />
              </>
            ) : null}
            {canAccessServerPanel ? <Route path="server" element={<ServerPage />} /> : null}
            {canManagePanelAccounts ? <Route path="panel-roles" element={<PanelRolesPage />} /> : null}
            <Route path="settings" element={<SettingsPage />} />
            {canAccessFinance ? (
              <>
                <Route path="finance/payments" element={<FinancePaymentsPage />} />
                <Route path="finance/ai-costs" element={<FinanceAiCostsPage />} />
                <Route path="finance/audience" element={<FinanceAudiencePage />} />
                <Route path="finance/notes" element={<FinanceNotesPage />} />
                <Route path="finance/reports" element={<FinanceReportsPage />} />
              </>
            ) : null}
          </Routes>
        </div>
      </main>
    </div>
  );
}

