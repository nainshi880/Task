import {
  enqueueNotification,
  JOB_TYPES,
} from "../queues/notification.queue.js";
import notificationService from "../services/notification.service.js";
import pushService from "../services/push.service.js";
import logger from "../utils/logger.js";

/**
 * Prefer BullMQ; fall back to direct notify when Redis is unavailable.
 */
export async function queueInAppNotification(payload) {
  const job = await enqueueNotification(JOB_TYPES.IN_APP, payload, {
    jobId: payload.jobId,
  });

  if (job) return { queued: true, jobId: job.id };

  const result = await notificationService.notify({
    ...payload,
    _fromQueue: true,
  });
  return { queued: false, result };
}

export async function queueChatOfflineNotification(payload) {
  const job = await enqueueNotification(JOB_TYPES.CHAT_OFFLINE, payload, {
    jobId: payload.jobId,
  });

  if (job) return { queued: true, jobId: job.id };

  const result = await notificationService.notify({
    ...payload,
    _fromQueue: true,
  });
  return { queued: false, result };
}

export async function queuePushNotification(payload) {
  const job = await enqueueNotification(JOB_TYPES.PUSH, payload);

  if (job) return { queued: true, jobId: job.id };

  try {
    const result = await pushService.sendToUser(payload.userId, {
      title: payload.title,
      body: payload.body || payload.message,
      data: payload.data || payload.metadata || {},
      event: payload.event,
    });
    return { queued: false, result };
  } catch (error) {
    logger.warn(`Direct push fallback failed: ${error.message}`);
    return { queued: false, result: null };
  }
}

export async function queueEmailJob(payload, options = {}) {
  return enqueueNotification(JOB_TYPES.EMAIL, payload, options);
}

export async function queueSmsJob(payload, options = {}) {
  return enqueueNotification(JOB_TYPES.SMS, payload, options);
}

export default {
  queueInAppNotification,
  queueChatOfflineNotification,
  queuePushNotification,
  queueEmailJob,
  queueSmsJob,
};
