const TOKEN_KEY = "token";
const REMEMBER_KEY = "rememberMe";

function getStorage(rememberMe) {
  return rememberMe ? localStorage : sessionStorage;
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function getRememberPreference() {
  return localStorage.getItem(REMEMBER_KEY) === "true";
}

export function persistAuthToken(token, rememberMe = true) {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);

  if (!token) return;

  getStorage(rememberMe).setItem(TOKEN_KEY, token);
  localStorage.setItem(REMEMBER_KEY, rememberMe ? "true" : "false");
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

export default {
  getStoredToken,
  getRememberPreference,
  persistAuthToken,
  clearAuthToken,
};
