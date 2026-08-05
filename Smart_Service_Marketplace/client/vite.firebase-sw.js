/**
 * Builds the Firebase messaging service worker source with Vite env injected.
 * Served at /firebase-messaging-sw.js in dev and written into dist on build.
 */
export function buildFirebaseMessagingSw() {
  const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || "",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.VITE_FIREBASE_APP_ID || "",
  };

  return `/* Auto-generated Firebase messaging service worker */
/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title =
    payload.notification?.title ||
    payload.data?.title ||
    "Smart Service Marketplace";
  const body =
    payload.notification?.body ||
    payload.data?.body ||
    payload.data?.message ||
    "";
  const link =
    payload.data?.actionUrl ||
    payload.data?.link ||
    payload.fcmOptions?.link ||
    "/technician/jobs";

  self.registration.showNotification(title, {
    body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: { ...payload.data, link },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    event.notification?.data?.link ||
    event.notification?.data?.actionUrl ||
    "/technician/jobs";
  const url = new URL(target, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
      return undefined;
    })
  );
});
`;
}

/**
 * Vite plugin: serve + emit firebase-messaging-sw.js with env config.
 */
export function firebaseMessagingSwPlugin() {
  return {
    name: "firebase-messaging-sw",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/firebase-messaging-sw.js")) {
          next();
          return;
        }
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        res.setHeader("Service-Worker-Allowed", "/");
        res.end(buildFirebaseMessagingSw());
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "firebase-messaging-sw.js",
        source: buildFirebaseMessagingSw(),
      });
    },
  };
}

export default firebaseMessagingSwPlugin;
