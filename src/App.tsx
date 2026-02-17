import { Routes, Route, Navigate } from 'react-router-dom';
import { useMemo } from 'react';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Promo from './pages/Promo';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const routes = useMemo(
    () => (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="docs" element={<div className="p-6 text-gray-600">Раздел «Документация» — в разработке.</div>} />
          <Route path="promo" element={<Promo />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    ),
    []
  );

  return routes;
}
