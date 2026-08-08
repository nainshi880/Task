import { Queue } from "bullmq";
import { getBullMqConnection, isRedisConfigured } from "../config/redis.js";
import {
  NOTIFICATION_QUEUE,
  buildNotificationJobId,
} from "../constants/notificationQueue.js";
import metricsStore from "../utils/metrics.js";
import logger from "../utils/logger.js";

let notificationQueue = null;

export function getNotificationQueue() {
  if (!isRedisConfigured()) return null;
  if (notificationQueue) return notificationQueue;

  const connection = getBullMqConnection();
  if (!connection) return null;

  notificationQueue = new Queue(NOTIFICATION_QUEUE.NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1000 },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  });

  notificationQueue.on("error", (error) => {
    logger.warn(`Notification queue error: ${error.message}`);
  });

  return notificationQueue;
}

/**
 * Enqueue a notification job. Returns { queued: true } when BullMQ accepts it.
 * Callers should fall back to in-process delivery when queued is false.
 */
export async function enqueueNotificationJob(type, payload = {}, options = {}) {
  const queue = getNotificationQueue();
  if (!queue) {
    return { queued: false, reason: "redis_unavailable" };
  }

  const jobId =
    options.jobId ||
    buildNotificationJobId(
      type,
      options.dedupeKey ||
        `${payload.userId || payload.to || "anon"}_${Date.now()}`
    );

  try {
    const job = await queue.add(
      type,
      { type, ...payload },
      {
        jobId,
        priority: options.priority || 3,
        delay: options.delay || 0,
      }
    );

    metricsStore.recordQueueEvent(NOTIFICATION_QUEUE.NAME, "enqueued");
    return { queued: true, jobId: job.id };
  } catch (error) {
    if (/already exists|Job .* exists/i.test(error.message)) {
      return { queued: false, reason: "duplicate_job", jobId };
    }
    logger.warn(`Failed to enqueue notification job: ${error.message}`);
    return { queued: false, reason: error.message };
  }
}

export async function closeNotificationQueue() {
  if (!notificationQueue) return;
  await notificationQueue.close();
  notificationQueue = null;
}

export default {
  getNotificationQueue,
  enqueueNotificationJob,
  closeNotificationQueue,
};
