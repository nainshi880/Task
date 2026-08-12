/**
 * Builds the Firebase messaging service worker source with Vite env injected.
 * Served at /firebase-messaging-sw.js in dev and written into dist on build.
 *
 * Features:
 * - Custom notification sound (/sounds/notification.wav)
 * - Deeplink open on click (absolute or app-relative)
 * - postMessage to focused SPA clients for soft navigation
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
const DEFAULT_SOUND = "/sounds/notification.wav";
const DEFAULT_LINK = "/";

function resolveDeeplink(payload) {
  const data = payload?.data || {};
  const candidate =
    data.deeplink ||
    data.actionUrl ||
    data.link ||
    data.click_action ||
    payload?.fcmOptions?.link ||
    payload?.notification?.click_action ||
    DEFAULT_LINK;
  try {
    return new URL(candidate, self.location.origin).href;
  } catch {
    return new URL(DEFAULT_LINK, self.location.origin).href;
  }
}

function toAppPath(absoluteOrPath) {
  try {
    const url = new URL(absoluteOrPath, self.location.origin);
    if (url.origin === self.location.origin) {
      return url.pathname + url.search + url.hash || DEFAULT_LINK;
    }
    return url.href;
  } catch {
    return DEFAULT_LINK;
  }
}

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
  const deeplink = resolveDeeplink(payload);
  const appPath = toAppPath(deeplink);
  const sound =
    payload.data?.soundPath ||
    payload.data?.sound ||
    DEFAULT_SOUND;

  const notifyData = {
    ...(payload.data || {}),
    deeplink,
    link: appPath,
    actionUrl: appPath,
    click_action: deeplink,
  };

  self.registration.showNotification(title, {
    body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    sound,
    silent: false,
    renotify: true,
    tag: notifyData.extraChargeId || notifyData.bookingId || notifyData.type || "ssm-push",
    data: notifyData,
    vibrate: [120, 60, 120],
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification?.data || {};
  const deeplink =
    data.deeplink ||
    data.click_action ||
    (data.link ? new URL(data.link, self.location.origin).href : null) ||
    (data.actionUrl ? new URL(data.actionUrl, self.location.origin).href : null) ||
    new URL(DEFAULT_LINK, self.location.origin).href;
  const appPath = toAppPath(deeplink);

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windowClients) => {
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            try {
              client.postMessage({
                type: "ssm:notification-click",
                deeplink,
                path: appPath,
                data,
              });
            } catch {
              // ignore postMessage failures
            }
            if (typeof client.navigate === "function") {
              try {
                await client.navigate(deeplink);
              } catch {
                // some browsers restrict navigate()
              }
            }
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(deeplink);
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
