import { createElement, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuth from "./useAuth";
import {
  registerFcmToken,
  clearStoredFcmToken,
  listenForForegroundMessages,
} from "../lib/fcm";
import { isFirebaseWebConfigured } from "../lib/firebase";
import {
  playNotificationSound,
  resolveNotificationPath,
  navigateToDeeplink,
} from "../utils/notificationSound";

/**
 * Registers an FCM web push token after the user is authenticated,
 * plays a custom sound + toast (with deeplink) for foreground pushes,
 * and handles service-worker notification clicks via soft navigation.
 */
export default function useFcmRegistration() {
  const navigate = useNavigate();
  const { isAuthenticated, token, isLoading, role } = useAuth();
  const attemptedRef = useRef(false);
  const navigateRef = useRef(navigate);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

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

  // Foreground pushes (app open)
  useEffect(() => {
    if (!isAuthenticated || !token || !isFirebaseWebConfigured()) {
      return undefined;
    }

    let unsubscribe = () => {};
    let active = true;

    listenForForegroundMessages((payload) => {
      if (!active) return;

      playNotificationSound();

      const title =
        payload?.notification?.title ||
        payload?.data?.title ||
        "New notification";
      const body =
        payload?.notification?.body ||
        payload?.data?.body ||
        payload?.data?.message ||
        "";
      const path = resolveNotificationPath(payload, "/notifications");

      toast(
        (t) =>
          createElement(
            "button",
            {
              type: "button",
              className: "text-left",
              onClick: () => {
                toast.dismiss(t.id);
                navigateToDeeplink(navigateRef.current, path);
              },
            },
            createElement(
              "span",
              { className: "block font-semibold" },
              title
            ),
            body
              ? createElement(
                  "span",
                  { className: "mt-0.5 block text-sm opacity-90" },
                  body
                )
              : null,
            createElement(
              "span",
              { className: "mt-1 block text-xs underline opacity-80" },
              "Open"
            )
          ),
        {
          icon: role === "technician" ? "🧰" : "🔔",
          duration: 8000,
        }
      );
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

  // Background notification click → SPA deeplink
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) {
      return undefined;
    }

    const onMessage = (event) => {
      const data = event?.data;
      if (!data || data.type !== "ssm:notification-click") return;
      const path = data.path || resolveNotificationPath(data, "/");
      navigateToDeeplink(navigateRef.current, path);
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);
}
