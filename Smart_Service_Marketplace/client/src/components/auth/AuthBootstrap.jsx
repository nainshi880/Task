/**
 * Settles auth on startup. If the API is down / session is invalid
 * (e.g. after a server restart), clear the token and return to the landing page.
 */
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import useAuth from "../../hooks/useAuth";
import useFcmRegistration from "../../hooks/useFcmRegistration";

/** App shells that should not remain open without a valid session */
const BOUNCE_TO_LANDING = [
  "/dashboard",
  "/technician",
  "/admin",
  "/setup",
  "/profile",
  "/bookings",
  "/booking",
  "/book-service",
  "/notifications",
  "/chat",
  "/services",
];

function shouldBounceToLanding(pathname) {
  return BOUNCE_TO_LANDING.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function AuthBootstrap({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const setLoading = useAuthStore((s) => s.setLoading);
  const clearSession = useAuthStore((s) => s.clearSession);
  const { isAuthenticated, isLoading, meQuery } = useAuth();
  const hadTokenRef = useRef(Boolean(token));

  useFcmRegistration();

  useEffect(() => {
    if (token) hadTokenRef.current = true;
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
    }
  }, [token, setLoading]);

  // Lost session while on a protected app route → landing
  useEffect(() => {
    if (token || isLoading || isAuthenticated) return;
    if (!hadTokenRef.current) return;
    if (shouldBounceToLanding(location.pathname)) {
      hadTokenRef.current = false;
      navigate("/", { replace: true });
    }
  }, [token, isLoading, isAuthenticated, location.pathname, navigate]);

  // Server restart / unreachable API while restoring a stored token
  useEffect(() => {
    if (!token || isLoading || isAuthenticated) return;
    if (meQuery.isFetching) return;

    if (meQuery.isError || (!meQuery.data && !meQuery.isLoading)) {
      clearSession();
      hadTokenRef.current = false;
      if (
        shouldBounceToLanding(location.pathname) ||
        location.pathname.startsWith("/verify-email")
      ) {
        navigate("/", { replace: true });
      }
    }
  }, [
    token,
    isLoading,
    isAuthenticated,
    meQuery.isFetching,
    meQuery.isError,
    meQuery.data,
    meQuery.isLoading,
    clearSession,
    navigate,
    location.pathname,
  ]);

  return children;
}
