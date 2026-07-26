/** В RUNA один тип аккаунта панели — Админ. */
export function useAdminRole() {
  return {
    isFinanceAnalyst: false,
    canAccessFinance: false,
    canViewUsersPanel: true,
    canAccessServerPanel: false,
    canManagePanelAccounts: false,
    canEditReferralPartners: true,
    isAdmin: true,
  };
}
