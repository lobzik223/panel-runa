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
  const isFinanceAnalyst = role === 'finance_analyst';
  return {
    role,
    isSuperadmin: role === 'superadmin',
    isFinanceAnalyst,
    canManageUsers: role === 'superadmin' || role === 'admin',
    canAccessFinance: role === 'superadmin' || role === 'admin' || isFinanceAnalyst,
    /** Просмотр пользователей, рефералок, графиков, отзывов, заблокированных. */
    canViewUsersPanel: role === 'superadmin' || role === 'admin' || isFinanceAnalyst,
    canAccessServerPanel: role === 'superadmin' || role === 'admin',
    canEditDataLinks: role === 'superadmin' || role === 'admin',
    canCreateDataLinks: role === 'superadmin' || role === 'admin' || isFinanceAnalyst,
    canEditReferralPartners: role === 'superadmin' || role === 'admin' || isFinanceAnalyst,
    canModerateReviews: role === 'superadmin' || role === 'admin',
    canUnblockUsers: role === 'superadmin' || role === 'admin',
    canManagePanelAccounts: role === 'superadmin' || role === 'admin',
    canAccessSettings: role === 'superadmin' || role === 'admin' || isFinanceAnalyst,
  };
}
