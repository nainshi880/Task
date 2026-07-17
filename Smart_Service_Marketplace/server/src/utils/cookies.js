import crypto from "crypto";
import { COOKIE_NAMES } from "../constants/security.js";
import { getCookieOptions, getCsrfCookieOptions } from "../config/security.js";
import env from "../config/env.js";

const REFRESH_MAX_AGE_MS =
  parseDurationMs(env.JWT_REFRESH_EXPIRES_IN || "7d") || 7 * 24 * 60 * 60 * 1000;

function parseDurationMs(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d+)([smhd])$/i);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return amount * multipliers[unit];
}

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function setAuthCookies(res, { refreshToken }) {
  const csrfToken = generateCsrfToken();

  res.cookie(
    COOKIE_NAMES.REFRESH,
    refreshToken,
    getCookieOptions(REFRESH_MAX_AGE_MS)
  );

  res.cookie(
    COOKIE_NAMES.CSRF,
    csrfToken,
    getCsrfCookieOptions(REFRESH_MAX_AGE_MS)
  );

  return csrfToken;
}

export function clearAuthCookies(res) {
  res.clearCookie(COOKIE_NAMES.REFRESH, { path: "/" });
  res.clearCookie(COOKIE_NAMES.CSRF, { path: "/" });
}

export default {
  generateCsrfToken,
  setAuthCookies,
  clearAuthCookies,
};
