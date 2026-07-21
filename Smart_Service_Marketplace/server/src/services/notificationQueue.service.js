import notificationService from "./notification.service.js";
import emailService from "./email.service.js";
import pushService from "./push.service.js";
import logger from "../utils/logger.js";
import withRetry, { isTransientError } from "../utils/retry.js";

/**
 * In-process notification helpers (no Redis / BullMQ).
 * Retries transient failures inline.
 */
export async function queueInAppNotification(payload) {
  const result = await withRetry(
    () =>
      notificationService.notify({
        ...payload,
        _fromQueue: true,
      }),
    { retries: 2, delayMs: 200, shouldRetry: isTransientError }
  );
  return { queued: false, result };
}

export async function queueChatOfflineNotification(payload) {
  return queueInAppNotification(payload);
}

export async function queuePushNotification(payload) {
  const result = await pushService.sendToUser(payload.userId, {
    title: payload.title,
    body: payload.body || payload.message,
    data: payload.data || {},
  });
  return { queued: false, result };
}

export async function queueEmailJob(payload) {
  try {
    if (payload?.method && typeof emailService[payload.method] === "function") {
      const result = await withRetry(
        () => emailService[payload.method](payload.payload || payload.args || {}),
        { retries: 2, delayMs: 300, shouldRetry: isTransientError }
      );
      return { queued: false, result };
    }

    if (payload?.to && payload?.subject) {
      const result = await withRetry(
        () =>
          emailService.send({
            to: payload.to,
            subject: payload.subject,
            html: payload.html,
            attachments: payload.attachments,
            userId: payload.userId,
          }),
        { retries: 2, delayMs: 300, shouldRetry: isTransientError }
      );
      return { queued: false, result };
    }

    logger.warn("Unknown email job payload.");
    return { queued: false, result: null };
  } catch (error) {
    logger.warn(`Email job failed: ${error.message}`);
    return { queued: false, error: error.message };
  }
}

export default {
  queueInAppNotification,
  queueChatOfflineNotification,
  queuePushNotification,
  queueEmailJob,
};
