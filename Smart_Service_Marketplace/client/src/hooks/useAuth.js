import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as authService from "../services/auth.service";
import { useAuthStore } from "../store/authStore";
import { authKeys } from "../lib/queryClient";
import { getRoleHome } from "../constants/roles";

export default function useAuth() {
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const loginStore = useAuthStore((s) => s.login);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const clearSession = useAuthStore((s) => s.clearSession);

  const meQuery = useQuery({
    queryKey: authKeys.me(),
    queryFn: authService.me,
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    if (meQuery.isLoading || meQuery.isFetching) {
      setLoading(true);
      return;
    }

    if (meQuery.isError) {
      // Only clear session on auth failures — not network blips / server restarts.
      const status = meQuery.error?.response?.status;
      if (status === 401 || status === 403) {
        clearSession();
        queryClient.removeQueries({ queryKey: authKeys.all });
      } else {
        setLoading(false);
      }
      return;
    }

    if (meQuery.data) {
      setUser(meQuery.data);
      setLoading(false);
    }
  }, [
    token,
    meQuery.isLoading,
    meQuery.isFetching,
    meQuery.isError,
    meQuery.data,
    setUser,
    setLoading,
    clearSession,
    queryClient,
  ]);

  const login = (userData, jwtToken, options = {}) => {
    loginStore(userData, jwtToken, options);
    queryClient.setQueryData(authKeys.me(), userData);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore network errors during logout
    } finally {
      clearSession();
      queryClient.removeQueries({ queryKey: authKeys.all });
    }
  };

  const refreshSession = async () => {
    const result = await authService.refresh();
    const nextToken = result.token || result.accessToken;
    loginStore(result.user, nextToken, {
      refreshToken: result.refreshToken,
      rememberMe: useAuthStore.getState().rememberMe,
    });
    queryClient.setQueryData(authKeys.me(), result.user);
    return result;
  };

  return {
    user,
    token,
    refreshToken,
    isAuthenticated: Boolean(isAuthenticated && token && user),
    isLoading: Boolean(token) ? isLoading || meQuery.isLoading : false,
    loading: Boolean(token) ? isLoading || meQuery.isLoading : false,
    role: user?.role || null,
    homePath: getRoleHome(user?.role),
    login,
    logout,
    setUser,
    refreshSession,
    meQuery,
  };
}
