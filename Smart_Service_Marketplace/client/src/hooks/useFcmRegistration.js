import { useEffect, useRef } from "react";
import useAuth from "./useAuth";
import { registerFcmToken, clearStoredFcmToken } from "../lib/fcm";
import { isFirebaseWebConfigured } from "../lib/firebase";

/**
 * Registers an FCM web push token after the user is authenticated.
 * No-ops when Firebase web env vars are missing.
 */
export default function useFcmRegistration() {
  const { isAuthenticated, token, isLoading } = useAuth();
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
}
