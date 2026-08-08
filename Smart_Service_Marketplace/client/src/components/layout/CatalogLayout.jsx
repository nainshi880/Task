import useAuth from "../../hooks/useAuth";
import { ROLES } from "../../constants/roles";
import DashboardLayout from "../../layouts/DashboardLayout";
import PublicNavbar from "./PublicNavbar";
import LandingFooter from "../landing/LandingFooter";

/**
 * Authenticated customers keep the dashboard chrome.
 * Guests get the public navbar so they can browse/search services without logging in.
 */
function CatalogLayout({ children }) {
  const { isAuthenticated, role } = useAuth();

  if (isAuthenticated && role === ROLES.CUSTOMER) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNavbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}

export default CatalogLayout;
