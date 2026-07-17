/**
 * Thin bootstrap: ensures loading flag settles when there is no token.
 * Current user fetching is handled by React Query inside useAuth().
 */
import { useEffect } from "react";
import { useAuthStore } from "../../store/authStore";

export default function AuthBootstrap({ children }) {
  const token = useAuthStore((s) => s.token);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    if (!token) {
      setLoading(false);
    }
  }, [token, setLoading]);

  return children;
}
