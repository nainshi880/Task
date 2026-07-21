import { getToken, onMessage } from "firebase/messaging";
import {
  getFirebaseMessaging,
  isFirebaseWebConfigured,
} from "./firebase";
import * as authApi from "../api/auth.api";

const TOKEN_STORAGE_KEY = "ssm_fcm_token";

/**
 * Request notification permission, obtain an FCM token, and register it
 * with the backend (PUT /auth/device-token).
 */
export async function registerFcmToken() {
  if (!isFirebaseWebConfigured()) {
    return { registered: false, reason: "firebase_web_not_configured" };
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return { registered: false, reason: "notifications_unsupported" };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { registered: false, reason: "permission_denied" };
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return { registered: false, reason: "messaging_unsupported" };
    }

    // Ensure the Firebase messaging service worker is active.
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );
    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return { registered: false, reason: "no_token" };
    }

    const previous = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (previous === token) {
      return { registered: true, token, unchanged: true };
    }

    await authApi.updateDeviceToken(token);
    localStorage.setItem(TOKEN_STORAGE_KEY, token);

    return { registered: true, token };
  } catch (error) {
    console.warn("FCM token registration failed:", error?.message || error);
    return {
      registered: false,
      reason: error?.message || "registration_failed",
    };
  }
}

export function clearStoredFcmToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Foreground message listener (optional UI toast hook).
 */
export async function listenForForegroundMessages(handler) {
  const messaging = await getFirebaseMessaging();
  if (!messaging || typeof handler !== "function") {
    return () => {};
  }
  return onMessage(messaging, handler);
}

export default {
  registerFcmToken,
  clearStoredFcmToken,
  listenForForegroundMessages,
};
