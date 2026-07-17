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

export function getProfileSetupPath(role) {
  return PROFILE_SETUP_PATH[role] || null;
}

export function needsProfileSetup(user) {
  if (!user) return false;
  if (isAdminRole(user.role)) return false;
  return user.profileCompleted !== true;
}

export default ROLES;
