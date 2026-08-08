import notificationService from "./notification.service.js";
import emailService from "./email.service.js";
import pushService from "./push.service.js";
import logger from "../utils/logger.js";
import withRetry, { isTransientError } from "../utils/retry.js";
import { enqueueNotificationJob } from "../queues/notification.queue.js";
import { NOTIFICATION_QUEUE } from "../constants/notificationQueue.js";
import { isRedisConfigured } from "../config/redis.js";

/**
 * Prefer BullMQ notification queue when Redis is available.
 * Falls back to in-process delivery for local/dev without Redis.
 */

async function deliverOrEnqueue(type, payload, options = {}) {
  if (isRedisConfigured()) {
    const result = await enqueueNotificationJob(type, payload, options);
    if (result.queued) return result;
  }

  return { queued: false, fallback: true };
}

export async function queueInAppNotification(payload) {
  const enqueued = await deliverOrEnqueue(
    NOTIFICATION_QUEUE.JOBS.IN_APP,
    payload,
    {
      dedupeKey: optionsDedupe(
        payload.userId,
        payload.title,
        payload.bookingId || payload.paymentId
      ),
      priority: 2,
    }
  );

  if (enqueued.queued) return enqueued;

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
  const enqueued = await deliverOrEnqueue(
    NOTIFICATION_QUEUE.JOBS.PUSH,
    payload,
    {
      dedupeKey: optionsDedupe(
        payload.userId,
        payload.title,
        payload.data?.bookingId || payload.data?.paymentId
      ),
      priority: 1,
    }
  );

  if (enqueued.queued) return enqueued;

  const result = await pushService.sendToUser(payload.userId, {
    title: payload.title,
    body: payload.body || payload.message,
    data: payload.data || {},
  });
  return { queued: false, result };
}

export async function queueEmailJob(payload) {
  const enqueued = await deliverOrEnqueue(
    NOTIFICATION_QUEUE.JOBS.EMAIL,
    payload,
    {
      dedupeKey: optionsDedupe(
        payload.userId || payload.to,
        payload.method || payload.subject,
        payload.payload?.payment?._id || payload.payload?.booking?._id
      ),
      priority: 3,
    }
  );

  if (enqueued.queued) return enqueued;

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

export async function queueSocketEmit(payload) {
  const enqueued = await deliverOrEnqueue(
    NOTIFICATION_QUEUE.JOBS.SOCKET,
    payload,
    {
      dedupeKey: optionsDedupe(
        payload.userId || payload.room,
        payload.event,
        payload.payload?.bookingId
      ),
      priority: 1,
    }
  );

  if (enqueued.queued) return enqueued;

  // Fallback only works when Socket.IO is in this process
  try {
    const { getIO } = await import("../sockets/io.js");
    const io = getIO();
    if (!io) return { queued: false, reason: "socket_io_unavailable" };
    const room =
      payload.room || (payload.userId ? `user:${payload.userId}` : null);
    if (!room || !payload.event) {
      return { queued: false, reason: "invalid_socket_payload" };
    }
    io.to(room).emit(payload.event, payload.payload || {});
    return { queued: false, result: { sent: true } };
  } catch (error) {
    return { queued: false, error: error.message };
  }
}

function optionsDedupe(...parts) {
  return parts
    .filter((p) => p != null && p !== "")
    .map(String)
    .join("_")
    .slice(0, 120);
}

export default {
  queueInAppNotification,
  queueChatOfflineNotification,
  queuePushNotification,
  queueEmailJob,
  queueSocketEmit,
};
