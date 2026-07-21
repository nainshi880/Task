import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loader from "../components/ui/Loader";
import useAuth from "../hooks/useAuth";
import {
  getProfileSetupPath,
  getRoleHome,
  needsEmailVerification,
  needsProfileSetup,
  ROLES,
} from "../constants/roles";

/**
 * Requires any authenticated user.
 */
export function ProtectedRoute({ children, redirectTo = "/login" }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loader fullPage text="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (needsEmailVerification(user) && !location.pathname.startsWith("/verify-email")) {
    return <Navigate to="/verify-email" replace />;
  }

  return children ? children : <Outlet />;
}

/**
 * Requires one of the allowed roles.
 * Redirects incomplete profiles to the setup wizard (except when already on setup).
 */
export function RoleRoute({
  roles = [],
  children,
  fallbackPath,
  requireCompleteProfile = true,
}) {
  const { isAuthenticated, isLoading, role, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loader fullPage text="Checking authorization..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (needsEmailVerification(user)) {
    return <Navigate to="/verify-email" replace />;
  }

  if (roles.length && !roles.includes(role)) {
    return (
      <Navigate
        to={fallbackPath || getRoleHome(role)}
        replace
      />
    );
  }

  if (requireCompleteProfile && needsProfileSetup(user)) {
    const setupPath = getProfileSetupPath(role);
    if (setupPath && !location.pathname.startsWith("/setup")) {
      return <Navigate to={setupPath} replace />;
    }
  }

  return children ? children : <Outlet />;
}

/**
 * Authenticated route for the profile setup wizard.
 * Sends users with completed profiles to their role home.
 */
export function ProfileSetupRoute({ role, children }) {
  const { isAuthenticated, isLoading, role: userRole, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loader fullPage text="Checking authorization..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (needsEmailVerification(user)) {
    return <Navigate to="/verify-email" replace />;
  }

  if (userRole !== role) {
    return <Navigate to={getRoleHome(userRole)} replace />;
  }

  if (!needsProfileSetup(user)) {
    return <Navigate to={getRoleHome(userRole)} replace />;
  }

  return children ? children : <Outlet />;
}

export function CustomerRoute({ children }) {
  return (
    <RoleRoute roles={[ROLES.CUSTOMER]}>
      {children}
    </RoleRoute>
  );
}

export function TechnicianRoute({ children }) {
  return (
    <RoleRoute roles={[ROLES.TECHNICIAN]}>
      {children}
    </RoleRoute>
  );
}

/** Customer or technician — shared chat routes. */
export function ChatRoute({ children }) {
  return (
    <RoleRoute roles={[ROLES.CUSTOMER, ROLES.TECHNICIAN]}>
      {children}
    </RoleRoute>
  );
}

export function AdminRoute({ children }) {
  return (
    <RoleRoute
      roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}
      requireCompleteProfile={false}
    >
      {children}
    </RoleRoute>
  );
}

export function SuperAdminRoute({ children }) {
  return (
    <RoleRoute roles={[ROLES.SUPER_ADMIN]} requireCompleteProfile={false}>
      {children}
    </RoleRoute>
  );
}

export default ProtectedRoute;
