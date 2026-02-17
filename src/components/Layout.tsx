import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const iconDashboard = (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
  </svg>
);
const iconUsers = (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const iconDocs = (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const iconPromo = (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
  </svg>
);

const nav = [
  { to: '/', label: 'DashBoard (Главная)', icon: iconDashboard },
  { to: '/users', label: 'Пользователи', icon: iconUsers },
  { to: '/docs', label: 'Документация', icon: iconDocs },
  { to: '/promo', label: 'Промокоды', icon: iconPromo },
];

export default function Layout() {
  const navigate = useNavigate();
  const userJson = localStorage.getItem('admin_user');
  const user = userJson ? (JSON.parse(userJson) as { email: string; name?: string | null }) : null;

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="pt-4 px-4 pb-3 border-b border-gray-100">
          <div className="flex flex-col items-center gap-2">
            <img src="/logonoruna.png" alt="RUNA" className="h-11 object-contain" />
            <p className="text-center text-sm font-semibold text-runa-dark tracking-tight leading-tight">
              Runa Finance
            </p>
            <p className="text-center text-xs font-medium text-runa-orange tracking-wide uppercase">
              Панель управления
            </p>
          </div>
        </div>
        <nav className="p-3 flex-1">
          {nav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-runa-orange/10 text-runa-orange'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="min-h-[3.5rem] bg-white border-b-2 border-runa-orange/20 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-sm">Добро пожаловать,</span>
            <span className="font-semibold text-runa-dark">
              {user?.name || user?.email || 'Admin'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 bg-gray-100/80 px-3 py-1.5 rounded-lg border border-gray-200/80">
              {user?.email}
            </span>
            <button
              type="button"
              onClick={logout}
              className="text-sm font-medium text-runa-orange hover:text-white hover:bg-runa-orange border border-runa-orange/60 px-4 py-2 rounded-lg transition"
            >
              Выйти
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
