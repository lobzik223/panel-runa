import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LoginView } from '@/pages/LoginView';
import { Dashboard } from '@/pages/Dashboard';

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<LoginView />} />
        <Route path="/panel/*" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
