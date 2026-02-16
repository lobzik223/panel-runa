import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const nav = [
  { to: '/', label: 'DashBoard (Главная)' },
  { to: '/users', label: 'Пользователи' },
  { to: '/docs', label: 'Документация' },
  { to: '/promo', label: 'Промокоды' },
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
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <img src="/logonoruna.png" alt="RUNA" className="h-10 object-contain" />
        </div>
        <nav className="p-3 flex-1">
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-runa-orange/10 text-runa-orange'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h2 className="text-gray-800 font-medium">Добро пожаловать, {user?.name || user?.email || 'Admin'}!</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              type="button"
              onClick={logout}
              className="text-sm text-gray-500 hover:text-runa-orange"
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
