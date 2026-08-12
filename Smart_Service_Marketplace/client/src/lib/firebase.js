import { initializeApp, getApps } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function isFirebaseWebConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId &&
      import.meta.env.VITE_FIREBASE_VAPID_KEY
  );
}

/** Auth only needs core web config (VAPID is push-only). */
export function isFirebaseAuthConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}

export function getFirebaseApp() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return null;
  if (getApps().length) return getApps()[0];
  return initializeApp(firebaseConfig);
}

export async function getFirebaseMessaging() {
  if (!isFirebaseWebConfigured()) return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  const app = getFirebaseApp();
  if (!app) return null;
  return getMessaging(app);
}

export function getFirebaseAuth() {
  if (!isFirebaseAuthConfigured()) return null;
  const app = getFirebaseApp();
  if (!app) return null;
  return getAuth(app);
}

/**
 * Open Google Sign-In popup and return the Firebase ID token for the backend.
 */
export async function signInWithGooglePopup() {
  const auth = getFirebaseAuth();
  if (!auth) {
    const error = new Error(
      "Google sign-in is not configured. Check VITE_FIREBASE_* env vars."
    );
    error.code = "FIREBASE_AUTH_NOT_CONFIGURED";
    throw error;
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  provider.addScope("email");
  provider.addScope("profile");

  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();

  return {
    idToken,
    user: {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    },
  };
}

export async function signOutFirebase() {
  const auth = getFirebaseAuth();
  if (!auth) return;
  try {
    await signOut(auth);
  } catch {
    // non-blocking
  }
}

export default {
  isFirebaseWebConfigured,
  isFirebaseAuthConfigured,
  getFirebaseApp,
  getFirebaseMessaging,
  getFirebaseAuth,
  signInWithGooglePopup,
  signOutFirebase,
};
