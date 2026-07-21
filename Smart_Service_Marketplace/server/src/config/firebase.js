import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import env from "./env.js";
import logger from "../utils/logger.js";

let initialized = false;

function parsePrivateKey(raw) {
  if (!raw) return "";

  let key = String(raw).trim();

  // Strip wrapping quotes from .env values
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // Convert escaped newlines (common in .env) to real ones
  key = key.replace(/\\n/g, "\n").replace(/\\r/g, "");

  // Body-only keys (no PEM headers) — wrap as PKCS#8
  if (!key.includes("BEGIN") && /^[A-Za-z0-9+/=\s]+$/.test(key)) {
    const body = key.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") || key;
    key = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
  }

  return key.trim();
}

function loadCredentials() {
  const jsonRaw = (env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();
  if (jsonRaw && jsonRaw.length > 2 && jsonRaw !== "{}") {
    try {
      return JSON.parse(jsonRaw);
    } catch (error) {
      logger.warn(
        `FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON: ${error.message}`
      );
    }
  }

  if (
    env.FIREBASE_PROJECT_ID &&
    env.FIREBASE_CLIENT_EMAIL &&
    env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: parsePrivateKey(env.FIREBASE_PRIVATE_KEY),
    };
  }

  return null;
}

/**
 * Initialize Firebase Admin (idempotent). Safe to call at startup.
 */
export function initFirebase() {
  if (initialized || getApps().length > 0) {
    initialized = true;
    return getApp();
  }

  const credentials = loadCredentials();
  if (!credentials) {
    logger.warn(
      "Firebase Admin not configured — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (or FIREBASE_SERVICE_ACCOUNT_JSON)."
    );
    return null;
  }

  try {
    const app = initializeApp({
      credential: cert(credentials),
      projectId: credentials.projectId || env.FIREBASE_PROJECT_ID,
    });
    initialized = true;
    logger.info("Firebase Admin initialized for FCM push.");
    return app;
  } catch (error) {
    logger.warn(`Firebase Admin init failed: ${error.message}`);
    return null;
  }
}

export function isFirebaseReady() {
  return Boolean(initialized || getApps().length > 0);
}

export function getFirebaseMessaging() {
  if (!isFirebaseReady()) {
    initFirebase();
  }
  if (!isFirebaseReady()) return null;
  return getMessaging();
}

export default { initFirebase, isFirebaseReady, getFirebaseMessaging };
