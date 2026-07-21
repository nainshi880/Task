import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { getStoredToken } from "../utils/authStorage";
import { queryClient, authKeys } from "../lib/queryClient";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise = null;

function getCsrfToken() {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrfToken="))
    ?.split("=")[1];
}

function isAuthPage(pathname = window.location.pathname) {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify-") ||
    pathname.startsWith("/setup/")
  );
}

async function refreshAccessToken() {
  const csrf = getCsrfToken();
  const response = await axios.post(
    `${api.defaults.baseURL}/auth/refresh`,
    {},
    {
      withCredentials: true,
      headers: csrf
        ? { "X-CSRF-Token": decodeURIComponent(csrf) }
        : undefined,
    }
  );

  const payload = response.data?.data ?? response.data;
  const nextToken = payload.token || payload.accessToken;

  useAuthStore.getState().login(payload.user, nextToken, {
    refreshToken: payload.refreshToken,
    rememberMe: useAuthStore.getState().rememberMe,
  });

  queryClient.setQueryData(authKeys.me(), payload.user);

  return nextToken;
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token || getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  const csrf = getCsrfToken();
  if (csrf) {
    config.headers["X-CSRF-Token"] = decodeURIComponent(csrf);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.message || "";

    if (
      status === 403 &&
      /verify your email/i.test(message) &&
      !window.location.pathname.startsWith("/verify-email")
    ) {
      window.location.assign("/verify-email");
      return Promise.reject(error);
    }

    if (status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh after failed login/logout/auth flows
    const url = String(original.url || "");
    const skipRefresh =
      url.includes("/auth/refresh") ||
      url.includes("/auth/login") ||
      url.includes("/admin/login") ||
      url.includes("/admin/refresh") ||
      url.includes("/auth/register") ||
      url.includes("/auth/logout") ||
      url.includes("/admin/logout") ||
      url.includes("/forgot-password") ||
      url.includes("/reset-password") ||
      url.includes("/verify-email");

    if (skipRefresh) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      refreshPromise = refreshPromise || refreshAccessToken();
      const nextToken = await refreshPromise;
      refreshPromise = null;

      original.headers.Authorization = `Bearer ${nextToken}`;
      return api(original);
    } catch (refreshError) {
      refreshPromise = null;
      useAuthStore.getState().clearSession();
      queryClient.removeQueries({ queryKey: authKeys.all });

      if (!isAuthPage()) {
        window.location.assign("/login");
      }

      // Prefer the original 401 message (e.g. invalid credentials)
      return Promise.reject(error);
    }
  }
);

export default api;
