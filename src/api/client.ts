import axios from 'axios';

// В продакшене: VITE_API_URL=https://api.runafinance.online (при сборке). Локально — относительный /api (прокси Vite).
const API_BASE = typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '') + '/api'
  : '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('auth/login')) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export type AdminUser = { id: number; email: string; name: string | null; role: string };

export async function login(email: string, password: string): Promise<{ accessToken: string; admin: AdminUser }> {
  const { data } = await api.post<{ accessToken: string; admin: AdminUser }>('/admin/auth/login', { email, password });
  return data;
}

export async function getMe(): Promise<AdminUser> {
  const { data } = await api.get<AdminUser>('/admin/me');
  return data;
}
