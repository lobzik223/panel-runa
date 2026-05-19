import { useMemo } from 'react';
import { getAdminRole } from '@/lib/adminApi';

export type PanelRole = 'superadmin' | 'admin' | 'finance_analyst' | null;

function normalizeRole(raw: string | null): PanelRole {
  const r = (raw || '').toLowerCase();
  if (r === 'superadmin' || r === 'super_admin') return 'superadmin';
  if (r === 'finance_analyst') return 'finance_analyst';
  if (r === 'admin') return 'admin';
  return raw ? 'admin' : null;
}

export function useAdminRole() {
  const role = useMemo(() => normalizeRole(getAdminRole()), []);
  return {
    role,
    isSuperadmin: role === 'superadmin',
    isFinanceAnalyst: role === 'finance_analyst',
    canManageUsers: role === 'superadmin' || role === 'admin',
    canAccessFinance: role === 'superadmin' || role === 'admin' || role === 'finance_analyst',
  };
}
