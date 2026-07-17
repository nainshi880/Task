const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  CUSTOMER: "customer",
  TECHNICIAN: "technician",
};

/** Roles that can access the admin panel and admin APIs. */
export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

export function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

export function isSuperAdmin(role) {
  return role === ROLES.SUPER_ADMIN;
}

export default ROLES;
