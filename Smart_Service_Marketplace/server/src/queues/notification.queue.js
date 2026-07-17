import { Queue } from "bullmq";
import { getBullmqConnection, isQueueEnabled } from "../config/queue.js";
import logger from "../utils/logger.js";

export const QUEUE_NAMES = {
  NOTIFICATIONS: "notifications",
};

export const JOB_TYPES = {
  IN_APP: "notification:in-app",
  PUSH: "notification:push",
  EMAIL: "notification:email",
  SMS: "notification:sms",
  CHAT_OFFLINE: "notification:chat-offline",
};

let notificationQueue = null;

export function getNotificationQueue() {
  if (notificationQueue) return notificationQueue;
  if (!isQueueEnabled()) return null;

  const connection = getBullmqConnection();
  if (!connection) return null;

  try {
    notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
      },
    });

    notificationQueue.on("error", (err) => {
      logger.warn(`Notification queue error: ${err.message}`);
    });

    return notificationQueue;
  } catch (error) {
    logger.warn(`Failed to create notification queue: ${error.message}`);
    return null;
  }
}

/**
 * Enqueue a job. Falls back to null when Redis/queue unavailable
 * so callers can process synchronously.
 */
export async function enqueueNotification(jobType, data, options = {}) {
  const queue = getNotificationQueue();
  if (!queue) return null;

  try {
    const job = await queue.add(jobType, data, {
      priority: options.priority || undefined,
      delay: options.delay || 0,
      jobId: options.jobId,
    });
    return job;
  } catch (error) {
    logger.warn(`Failed to enqueue ${jobType}: ${error.message}`);
    return null;
  }
}

export default {
  getNotificationQueue,
  enqueueNotification,
  QUEUE_NAMES,
  JOB_TYPES,
};
