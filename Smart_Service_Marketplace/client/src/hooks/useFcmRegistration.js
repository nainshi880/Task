import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import useAuth from "./useAuth";
import {
  registerFcmToken,
  clearStoredFcmToken,
  listenForForegroundMessages,
} from "../lib/fcm";
import { isFirebaseWebConfigured } from "../lib/firebase";

/**
 * Registers an FCM web push token after the user is authenticated
 * and shows toasts for foreground push messages (e.g. new job offers).
 */
export default function useFcmRegistration() {
  const { isAuthenticated, token, isLoading, role } = useAuth();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !token || isLoading) {
      if (!isAuthenticated) {
        attemptedRef.current = false;
        clearStoredFcmToken();
      }
      return undefined;
    }

    if (!isFirebaseWebConfigured() || attemptedRef.current) {
      return undefined;
    }

    attemptedRef.current = true;
    registerFcmToken().catch(() => {
      // non-blocking
    });

    return undefined;
  }, [isAuthenticated, token, isLoading]);

  // Foreground pushes (app open) — especially useful for technicians
  useEffect(() => {
    if (!isAuthenticated || !token || !isFirebaseWebConfigured()) {
      return undefined;
    }

    let unsubscribe = () => {};
    let active = true;

    listenForForegroundMessages((payload) => {
      if (!active) return;
      const title =
        payload?.notification?.title ||
        payload?.data?.title ||
        "New notification";
      const body =
        payload?.notification?.body ||
        payload?.data?.body ||
        payload?.data?.message ||
        "";
      toast(`${title}${body ? `: ${body}` : ""}`, {
        icon: role === "technician" ? "🧰" : "🔔",
        duration: 6000,
      });
    }).then((unsub) => {
      if (!active) {
        unsub?.();
        return;
      }
      unsubscribe = unsub || (() => {});
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [isAuthenticated, token, role]);
}
