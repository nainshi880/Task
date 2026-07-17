import { create } from "zustand";
import {
  clearAuthToken,
  getRememberPreference,
  getStoredToken,
  persistAuthToken,
} from "../utils/authStorage";

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export const useAuthStore = create((set, get) => ({
  user: null,
  token: getStoredToken(),
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  rememberMe: getRememberPreference(),

  setLoading: (isLoading) => set({ isLoading }),

  setUser: (user) =>
    set({
      user,
      isAuthenticated: Boolean(get().token && user),
    }),

  setSession: ({ user = null, token = null, refreshToken = null, rememberMe } = {}) => {
    const preferRemember =
      rememberMe === undefined ? get().rememberMe : Boolean(rememberMe);

    if (token) {
      persistAuthToken(token, preferRemember);
    }

    set({
      user,
      token: token || get().token,
      refreshToken:
        refreshToken !== null && refreshToken !== undefined
          ? refreshToken
          : get().refreshToken,
      rememberMe: preferRemember,
      isAuthenticated: Boolean((token || get().token) && user),
      isLoading: false,
    });
  },

  login: (user, token, options = {}) => {
    const rememberMe = options.rememberMe ?? getRememberPreference();
    const refreshToken = options.refreshToken ?? null;

    persistAuthToken(token, rememberMe);

    set({
      user,
      token,
      refreshToken,
      rememberMe,
      isAuthenticated: Boolean(token && user),
      isLoading: false,
    });
  },

  clearSession: () => {
    clearAuthToken();
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  hasRefreshCookie: () => Boolean(getCookie("refreshToken") || getCookie("csrfToken")),
}));

export default useAuthStore;
