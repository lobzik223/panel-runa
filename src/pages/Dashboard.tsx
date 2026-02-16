export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">DashBoard (Главная)</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Пользователей онлайн</p>
          <p className="text-2xl font-bold text-runa-orange">—</p>
          <p className="text-xs text-gray-400 mt-1">обновление каждые 10 мин</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Рост подписок</p>
          <p className="text-2xl font-bold text-gray-800">—</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Статистика за сегодня</p>
          <p className="text-2xl font-bold text-gray-800">—</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Новые регистрации</p>
          <p className="text-2xl font-bold text-gray-800">—</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-4">Обзор прогресса</h3>
        <p className="text-gray-500 text-sm">Графики и точная статистика будут подключены после настройки эндпоинтов на бэкенде.</p>
      </div>
    </div>
  );
}
