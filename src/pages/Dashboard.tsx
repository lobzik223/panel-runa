import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { getDashboardStats } from '../api/client';

const CARD_COLORS = {
  online: { bg: 'from-runa-orange/10 to-runa-orange/5', text: 'text-runa-orange', icon: '#C45C26' },
  subscriptions: { bg: 'from-emerald-500/10 to-emerald-500/5', text: 'text-emerald-600', icon: '#10b981' },
  today: { bg: 'from-amber-500/10 to-amber-500/5', text: 'text-amber-600', icon: '#f59e0b' },
  week: { bg: 'from-teal-500/10 to-teal-500/5', text: 'text-teal-600', icon: '#14b8a6' },
};

const DONUT_COLORS = ['#93c5fd', '#fde047', '#f9a8d4', '#86efac'];

function CardSparkline({ points }: { points: number[] }) {
  const safe = points.length >= 2 ? points : [0, 0];
  const max = Math.max(...safe, 1);
  const w = 80;
  const h = 32;
  const d = safe
    .map((p, i) => `${(i / (safe.length - 1)) * w},${h - (p / max) * h}`)
    .join(' ');
  return (
    <svg className="absolute right-3 bottom-3 w-20 h-9 opacity-40" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={d} />
    </svg>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<{
    usersOnline: number;
    subscriptionsActive: number;
    usersToday: number;
    newRegistrations: number;
    chartData: { date: string; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDashboardStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.response?.data?.message || 'Не удалось загрузить статистику');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !stats) {
    return (
      <div>
        <p className="text-sm text-gray-500 mb-2">Главная &gt; DashBoard</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Обзор</h1>
        <p className="text-gray-500">Загрузка…</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div>
        <p className="text-sm text-gray-500 mb-2">Главная &gt; DashBoard</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Обзор</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const s = stats!;
  const chartPoints = s.chartData?.length ? s.chartData.map((d) => d.count) : [0, 0];
  const donutData = [
    { name: 'Онлайн', value: s.usersOnline, count: s.usersOnline },
    { name: 'Подписки', value: s.subscriptionsActive, count: s.subscriptionsActive },
    { name: 'Сегодня', value: s.usersToday, count: s.usersToday },
    { name: 'За 7 дней', value: s.newRegistrations, count: s.newRegistrations },
  ].filter((d) => d.value > 0);
  const totalDonut = donutData.reduce((a, b) => a + b.value, 0) || 1;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-1">Главная &gt; DashBoard</p>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Обзор</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div
          className={`relative bg-gradient-to-br ${CARD_COLORS.online.bg} rounded-2xl border border-gray-100 p-5 shadow-md overflow-hidden min-h-[120px] flex flex-col justify-between`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-0.5">Пользователей онлайн</p>
              <p className={`text-2xl font-bold ${CARD_COLORS.online.text}`}>{s.usersOnline}</p>
              <p className="text-xs text-gray-500 mt-1">обновление каждые 10 мин</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke={CARD_COLORS.online.icon} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
          </div>
          <CardSparkline points={chartPoints.slice(-7)} />
        </div>

        <div
          className={`relative bg-gradient-to-br ${CARD_COLORS.subscriptions.bg} rounded-2xl border border-gray-100 p-5 shadow-md overflow-hidden min-h-[120px] flex flex-col justify-between`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-0.5">Активных подписок</p>
              <p className={`text-2xl font-bold ${CARD_COLORS.subscriptions.text}`}>{s.subscriptionsActive}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke={CARD_COLORS.subscriptions.icon} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <CardSparkline points={chartPoints.slice(-7)} />
        </div>

        <div
          className={`relative bg-gradient-to-br ${CARD_COLORS.today.bg} rounded-2xl border border-gray-100 p-5 shadow-md overflow-hidden min-h-[120px] flex flex-col justify-between`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-0.5">Регистраций за сегодня</p>
              <p className={`text-2xl font-bold ${CARD_COLORS.today.text}`}>{s.usersToday}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke={CARD_COLORS.today.icon} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <CardSparkline points={chartPoints.slice(-7)} />
        </div>

        <div
          className={`relative bg-gradient-to-br ${CARD_COLORS.week.bg} rounded-2xl border border-gray-100 p-5 shadow-md overflow-hidden min-h-[120px] flex flex-col justify-between`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-0.5">Новые регистрации (7 дней)</p>
              <p className={`text-2xl font-bold ${CARD_COLORS.week.text}`}>{s.newRegistrations}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke={CARD_COLORS.week.icon} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
          </div>
          <CardSparkline points={chartPoints.slice(-7)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-md">
          <h3 className="font-semibold text-gray-800 mb-4">Регистрации по дням</h3>
          {s.chartData && s.chartData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.chartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E85D04" />
                      <stop offset="100%" stopColor="#C45C26" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickFormatter={(v) => (v ? String(v).slice(5) : '')}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                    formatter={(value: number) => [value, 'регистраций']}
                    labelFormatter={(label) => `Дата: ${label}`}
                  />
                  <Bar
                    dataKey="count"
                    fill="url(#barGradient)"
                    radius={[6, 6, 0, 0]}
                    name="Регистрации"
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-8">Нет данных за период.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-md">
          <h3 className="font-semibold text-gray-800 mb-4">Обзор показателей</h3>
          {donutData.length > 0 ? (
            <div className="h-72 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <defs>
                    {DONUT_COLORS.map((color, i) => (
                      <linearGradient key={i} id={`donut-${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.85} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={entry.name} fill={`url(#donut-${i})`} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(value, entry) => (
                      <span className="text-sm text-gray-600">
                        {value} <span className="text-gray-400 font-normal">({entry?.payload?.count ?? 0})</span>
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-center text-sm font-semibold text-gray-700 mt-2">
                Всего: {totalDonut}
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-8">Нет данных для отображения.</p>
          )}
        </div>
      </div>
    </div>
  );
}
