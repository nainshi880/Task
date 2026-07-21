import { getFirebaseMessaging, isFirebaseReady } from "../config/firebase.js";
import authRepository from "../repositories/auth.repository.js";
import logger from "../utils/logger.js";

/**
 * Send FCM push via Firebase Admin SDK.
 * Invalid / unregistered tokens are pruned from the user document.
 */
class PushService {
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

    const stringData = Object.fromEntries(
      Object.entries(data || {}).map(([k, v]) => [k, v == null ? "" : String(v)])
    );

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: unique,
        notification: {
          title: title || "Notification",
          body: body || "",
        },
        data: stringData,
        webpush: {
          fcmOptions: {
            link: stringData.actionUrl || stringData.link || "/",
          },
        },
      });

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
      };
    } catch (error) {
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
