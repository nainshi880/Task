/**
 * Push notification sound + deeplink helpers (server).
 */
import env from "../config/env.js";

/** Relative path served by the Vite client (public/). */
export const PUSH_SOUND_PATH = "/sounds/notification.wav";

/** Android/APNs sound resource name (default system sound as fallback). */
export const PUSH_NATIVE_SOUND = "default";

/**
 * Resolve CLIENT_URL origin without trailing slash.
 */
export function getClientOrigin() {
  const raw = (env.CLIENT_URL || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return raw.replace(/\/$/, "");
  }
}

/**
 * Absolute URL for the custom notification sound asset.
 */
export function getPushSoundUrl() {
  const origin = getClientOrigin();
  return origin ? `${origin}${PUSH_SOUND_PATH}` : PUSH_SOUND_PATH;
}

/**
 * Normalize a path or URL into an absolute deeplink on the client origin.
 * Relative paths like `/bookings/123` become `https://app.../bookings/123`.
 */
export function buildDeeplink(pathOrUrl, fallback = "/") {
  const origin = getClientOrigin();
  const raw = String(pathOrUrl || fallback || "/").trim() || fallback || "/";

  if (/^https?:\/\//i.test(raw)) {
    try {
      const absolute = new URL(raw);
      // Prefer same-origin relative path when CLIENT_URL is set
      if (origin && absolute.origin === origin) {
        return `${absolute.origin}${absolute.pathname}${absolute.search}${absolute.hash}`;
      }
      return absolute.href;
    } catch {
      // fall through
    }
  }

  const path = raw.startsWith("/") ? raw : `/${raw}`;
  if (!origin) return path;
  return `${origin}${path}`;
}

/**
 * Path-only deeplink for SPA navigation (always starts with /).
 */
export function toAppPath(pathOrUrl, fallback = "/") {
  const raw = String(pathOrUrl || fallback || "/").trim() || fallback || "/";
  if (/^https?:\/\//i.test(raw)) {
    try {
      const absolute = new URL(raw);
      return `${absolute.pathname}${absolute.search}${absolute.hash}` || fallback;
    } catch {
      return fallback;
    }
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export default {
  PUSH_SOUND_PATH,
  PUSH_NATIVE_SOUND,
  getClientOrigin,
  getPushSoundUrl,
  buildDeeplink,
  toAppPath,
};
  