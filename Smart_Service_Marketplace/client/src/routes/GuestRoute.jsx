import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loader from "../components/ui/Loader";
import useAuth from "../hooks/useAuth";
import {
  getProfileSetupPath,
  getPostLoginRedirect,
  needsEmailVerification,
  needsProfileSetup,
} from "../constants/roles";

function GuestRoute() {
  const { isAuthenticated, isLoading, role, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loader fullPage text="Loading..." />;
  }

  if (isAuthenticated) {
    // Incomplete email verification should not trap guests on /verify-email
    // via login/register — send them home; they can register again.
    if (needsEmailVerification(user)) {
      return <Navigate to="/" replace />;
    }

    const setupPath = needsProfileSetup(user)
      ? getProfileSetupPath(role)
      : null;

    const redirectTo =
      setupPath ||
      getPostLoginRedirect(role, location.state?.from?.pathname);

    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}

export default GuestRoute;
