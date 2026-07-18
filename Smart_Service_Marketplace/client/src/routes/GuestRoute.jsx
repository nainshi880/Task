import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loader from "../components/ui/Loader";
import useAuth from "../hooks/useAuth";
import {
  getProfileSetupPath,
  getRoleHome,
  needsProfileSetup,
} from "../constants/roles";

function GuestRoute() {
  const { isAuthenticated, isLoading, role, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loader fullPage text="Loading..." />;
  }

  if (isAuthenticated) {
    const setupPath = needsProfileSetup(user)
      ? getProfileSetupPath(role)
      : null;

    const redirectTo =
      setupPath ||
      location.state?.from?.pathname ||
      getRoleHome(role);

    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}

export default GuestRoute;
