export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  CUSTOMER: "customer",
  TECHNICIAN: "technician",
};

export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

export const ROLE_HOME = {
  [ROLES.CUSTOMER]: "/dashboard",
  [ROLES.TECHNICIAN]: "/technician/dashboard",
  [ROLES.ADMIN]: "/admin/dashboard",
  [ROLES.SUPER_ADMIN]: "/admin/dashboard",
};

export const PROFILE_SETUP_PATH = {
  [ROLES.CUSTOMER]: "/setup/customer",
  [ROLES.TECHNICIAN]: "/setup/technician",
};

export function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

export function isSuperAdmin(role) {
  return role === ROLES.SUPER_ADMIN;
}

export function getRoleHome(role) {
  return ROLE_HOME[role] || "/login";
}

/**
 * Safe post-login redirect: honor `from` only when it belongs to this role.
 * Prevents admins from landing on /technician/* (and vice versa) after login.
 */
export function getPostLoginRedirect(role, fromPath) {
  const home = getRoleHome(role);
  if (!fromPath || typeof fromPath !== "string") return home;

  const path = fromPath.split("?")[0];
  if (
    !path ||
    path === "/" ||
    path === "/login" ||
    path === "/admin/login" ||
    path === "/register" ||
    path.startsWith("/verify-email") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/forgot-password")
  ) {
    return home;
  }

  if (isAdminRole(role)) {
    return path.startsWith("/admin") ? path : home;
  }

  if (role === ROLES.TECHNICIAN) {
    if (path.startsWith("/technician") || path.startsWith("/chat")) {
      return path;
    }
    return home;
  }

  if (role === ROLES.CUSTOMER) {
    if (path.startsWith("/admin") || path.startsWith("/technician")) {
      return home;
    }
    return path;
  }

  return home;
}

export function getProfileSetupPath(role) {
  return PROFILE_SETUP_PATH[role] || null;
}

export function needsProfileSetup(user) {
  if (!user) return false;
  if (isAdminRole(user.role)) return false;
  return user.profileCompleted !== true;
}

/** Customers/technicians must verify email before using the app. */
export function needsEmailVerification(user) {
  if (!user) return false;
  if (isAdminRole(user.role)) return false;
  return user.isVerified !== true;
}

export default ROLES;
