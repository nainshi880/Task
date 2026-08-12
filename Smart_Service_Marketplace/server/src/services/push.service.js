import { getFirebaseMessaging, isFirebaseReady } from "../config/firebase.js";
import authRepository from "../repositories/auth.repository.js";
import { firebaseCircuit } from "../utils/circuitBreaker.js";
import {
  PUSH_NATIVE_SOUND,
  PUSH_SOUND_PATH,
  buildDeeplink,
  getClientOrigin,
  getPushSoundUrl,
  toAppPath,
} from "../utils/pushPayload.js";
import logger from "../utils/logger.js";

/**
 * Send FCM push via Firebase Admin SDK.
 * Includes custom sound (Android / APNs / web) and absolute deeplink.
 * Invalid / unregistered tokens are pruned from the user document.
 * Protected by firebase_fcm circuit breaker.
 */
class PushService {
  buildMessagePayload({ title, body, data = {} }) {
    const stringData = Object.fromEntries(
      Object.entries(data || {}).map(([k, v]) => [k, v == null ? "" : String(v)])
    );

    const appPath = toAppPath(
      stringData.deeplink ||
        stringData.actionUrl ||
        stringData.link ||
        stringData.click_action ||
        "/"
    );
    const deeplink = buildDeeplink(appPath);
    const soundUrl = getPushSoundUrl();
    const origin = getClientOrigin();
    const iconUrl = origin ? `${origin}/favicon.svg` : "/favicon.svg";

    // Canonical deeplink fields for clients / SW click handlers
    stringData.deeplink = deeplink;
    stringData.actionUrl = appPath;
    stringData.link = appPath;
    stringData.click_action = deeplink;
    stringData.sound = soundUrl;
    stringData.soundPath = PUSH_SOUND_PATH;
    if (!stringData.title && title) stringData.title = String(title);
    if (!stringData.body && body) stringData.body = String(body);

    return {
      notification: {
        title: title || "Notification",
        body: body || "",
      },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          sound: PUSH_NATIVE_SOUND,
          channelId: "ssm_default",
          clickAction: deeplink,
          defaultSound: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: PUSH_NATIVE_SOUND,
            badge: 1,
          },
        },
        fcmOptions: {
          imageUrl: iconUrl.startsWith("http") ? iconUrl : undefined,
        },
      },
      webpush: {
        headers: {
          Urgency: "high",
        },
        notification: {
          title: title || "Notification",
          body: body || "",
          icon: iconUrl,
          badge: iconUrl,
          // Custom sound — supported on some browsers / WebView shells
          sound: soundUrl,
          requireInteraction: Boolean(
            stringData.type?.includes("extra_charge") ||
              stringData.type?.includes("assigned")
          ),
          data: {
            ...stringData,
            deeplink,
            link: appPath,
            actionUrl: appPath,
          },
        },
        fcmOptions: {
          link: deeplink,
        },
      },
    };
  }

  async sendToTokens(tokens, { title, body, data = {} } = {}) {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      logger.debug("FCM skipped — Firebase Admin is not configured.");
      return { sent: false, reason: "firebase_not_configured" };
    }

    const unique = [...new Set((tokens || []).filter(Boolean).map(String))];
    if (!unique.length) {
      return { sent: false, reason: "no_tokens" };
    }

    const message = this.buildMessagePayload({ title, body, data });

    try {
      const response = await firebaseCircuit.exec(() =>
        messaging.sendEachForMulticast({
          tokens: unique,
          ...message,
        })
      );

      const invalidTokens = [];
      response.responses.forEach((res, index) => {
        if (res.success) return;
        const code = res.error?.code || "";
        if (
          code.includes("registration-token-not-registered") ||
          code.includes("invalid-registration-token") ||
          code.includes("invalid-argument")
        ) {
          invalidTokens.push(unique[index]);
        } else {
          logger.warn("FCM send failed for token", {
            code,
            message: res.error?.message,
          });
        }
      });

      return {
        sent: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
        deeplink: message.data?.deeplink,
      };
    } catch (error) {
      if (error.code === "CIRCUIT_OPEN") {
        return { sent: false, reason: "circuit_open" };
      }
      logger.warn(`FCM multicast failed: ${error.message}`);
      return { sent: false, reason: error.message };
    }
  }

  async sendToUser(userId, { title, body, data } = {}) {
    if (!userId) return { sent: false, reason: "no_user" };
    if (!isFirebaseReady() && !getFirebaseMessaging()) {
      return { sent: false, reason: "firebase_not_configured" };
    }

    const user = await authRepository.findById(userId);
    if (!user) return { sent: false, reason: "user_not_found" };

    const tokens = [];
    if (user.deviceToken) tokens.push(user.deviceToken);
    if (Array.isArray(user.deviceTokens)) tokens.push(...user.deviceTokens);

    const result = await this.sendToTokens(tokens, { title, body, data });

    if (result.invalidTokens?.length) {
      await this.pruneInvalidTokens(userId, user, result.invalidTokens);
    }

    return result;
  }

  async pruneInvalidTokens(userId, user, invalidTokens) {
    try {
      const invalid = new Set(invalidTokens.map(String));
      const nextTokens = (user.deviceTokens || []).filter(
        (t) => t && !invalid.has(String(t))
      );
      const nextPrimary =
        user.deviceToken && invalid.has(String(user.deviceToken))
          ? nextTokens[0] || null
          : user.deviceToken;

      await authRepository.updateUser(userId, {
        deviceToken: nextPrimary,
        deviceTokens: nextTokens,
      });
    } catch (error) {
      logger.warn(`Failed to prune invalid FCM tokens: ${error.message}`);
    }
  }
}

export default new PushService();
