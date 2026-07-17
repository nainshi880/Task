const ADMIN_AUTH = {
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,
  LOGIN_HISTORY_LIMIT: 20,
};

export const ADMIN_PERMISSIONS = {
  MANAGE_USERS: "manage_users",
  MANAGE_BOOKINGS: "manage_bookings",
  MANAGE_PAYMENTS: "manage_payments",
  MANAGE_TECHNICIANS: "manage_technicians",
  MANAGE_COUPONS: "manage_coupons",
  MANAGE_NOTIFICATIONS: "manage_notifications",
  VIEW_ANALYTICS: "view_analytics",
  MANAGE_SETTINGS: "manage_settings",
};

export default ADMIN_AUTH;
