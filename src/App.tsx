import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LoginView } from '@/pages/LoginView';
import { RevokeAdminPage } from '@/pages/RevokeAdminPage';
import { Dashboard } from '@/pages/Dashboard';

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<LoginView />} />
        <Route path="/revoke-admin" element={<RevokeAdminPage />} />
        <Route path="/panel/*" element={<Dashboard />} />
        {/* Регистрации на сайте нет — старые ссылки с поисковиков/закладок на экран входа */}
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="/verify-email" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
