import admin from "firebase-admin";
import env from "./env.js";
import logger from "../utils/logger.js";

let messaging = null;
let initialized = false;

function parsePrivateKey(key) {
  if (!key) return "";
  return key.replace(/\\n/g, "\n");
}

export function initFirebase() {
  if (initialized) return messaging;

  initialized = true;

  try {
    if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const credentials = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
      });
      messaging = admin.messaging();
      logger.info("Firebase Cloud Messaging initialized (JSON).");
      return messaging;
    }

    if (
      env.FIREBASE_PROJECT_ID &&
      env.FIREBASE_CLIENT_EMAIL &&
      env.FIREBASE_PRIVATE_KEY
    ) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: parsePrivateKey(env.FIREBASE_PRIVATE_KEY),
        }),
      });
      messaging = admin.messaging();
      logger.info("Firebase Cloud Messaging initialized (env credentials).");
      return messaging;
    }

    logger.warn(
      "FCM not configured — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (or FIREBASE_SERVICE_ACCOUNT_JSON)."
    );
    return null;
  } catch (error) {
    logger.error(`Firebase init failed: ${error.message}`);
    messaging = null;
    return null;
  }
}

export function getFirebaseMessaging() {
  if (!initialized) return initFirebase();
  return messaging;
}

export function isFcmConfigured() {
  return Boolean(getFirebaseMessaging());
}

export default { initFirebase, getFirebaseMessaging, isFcmConfigured };
