/** Custom push notification sound (public asset). */
export const NOTIFICATION_SOUND_PATH = "/sounds/notification.wav";

let sharedAudio = null;

/**
 * Play the custom notification chime (foreground pushes).
 * Browsers may block until the user has interacted with the page once.
 */
export function playNotificationSound() {
  if (typeof window === "undefined") return;

  try {
    if (!sharedAudio) {
      sharedAudio = new Audio(NOTIFICATION_SOUND_PATH);
      sharedAudio.preload = "auto";
      sharedAudio.volume = 0.85;
    } else {
      sharedAudio.pause();
      sharedAudio.currentTime = 0;
    }

    const playPromise = sharedAudio.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        // Autoplay policy — ignore silently
      });
    }
  } catch {
    // ignore
  }
}

/**
 * Normalize FCM / notification payload into an in-app path for React Router.
 */
export function resolveNotificationPath(payload, fallback = "/") {
  const data = payload?.data || payload || {};
  const candidate =
    data.actionUrl ||
    data.link ||
    data.path ||
    data.deeplink ||
    data.click_action ||
    fallback;

  if (!candidate) return fallback;

  try {
    if (/^https?:\/\//i.test(candidate)) {
      const url = new URL(candidate);
      if (typeof window !== "undefined" && url.origin === window.location.origin) {
        return `${url.pathname}${url.search}${url.hash}` || fallback;
      }
      // External absolute URL — return as-is for window.location
      return candidate;
    }
  } catch {
    // fall through
  }

  return String(candidate).startsWith("/")
    ? String(candidate)
    : `/${candidate}`;
}

/**
 * Navigate to a notification deeplink (SPA path or absolute URL).
 */
export function navigateToDeeplink(navigate, pathOrUrl) {
  if (!pathOrUrl) return;

  if (/^https?:\/\//i.test(pathOrUrl)) {
    try {
      const url = new URL(pathOrUrl);
      if (typeof window !== "undefined" && url.origin === window.location.origin) {
        const path = `${url.pathname}${url.search}${url.hash}` || "/";
        if (typeof navigate === "function") {
          navigate(path);
          return;
        }
      }
      window.location.assign(pathOrUrl);
      return;
    } catch {
      window.location.assign(pathOrUrl);
      return;
    }
  }

  if (typeof navigate === "function") {
    navigate(pathOrUrl);
  } else if (typeof window !== "undefined") {
    window.location.assign(pathOrUrl);
  }
}

export default {
  NOTIFICATION_SOUND_PATH,
  playNotificationSound,
  resolveNotificationPath,
  navigateToDeeplink,
};
