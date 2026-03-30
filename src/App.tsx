import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LoginView } from '@/pages/LoginView';
import { RegisterView } from '@/pages/RegisterView';
import { VerifyEmailView } from '@/pages/VerifyEmailView';
import { Dashboard } from '@/pages/Dashboard';

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<LoginView />} />
        <Route path="/register" element={<RegisterView />} />
        <Route path="/verify-email" element={<VerifyEmailView />} />
        <Route path="/panel/*" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
