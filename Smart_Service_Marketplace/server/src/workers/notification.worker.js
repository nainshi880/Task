import { Worker } from "bullmq";
import { getBullmqConnection, isQueueEnabled } from "../config/queue.js";
import {
  QUEUE_NAMES,
  JOB_TYPES,
} from "../queues/notification.queue.js";
import notificationService from "../services/notification.service.js";
import pushService from "../services/push.service.js";
import emailService from "../services/email.service.js";
import smsService from "../services/sms.service.js";
import logger from "../utils/logger.js";

let worker = null;

async function processJob(job) {
  const { name, data } = job;

  switch (name) {
    case JOB_TYPES.IN_APP:
    case JOB_TYPES.CHAT_OFFLINE: {
      return await notificationService.notify({
        ...data,
        skipPreferenceCheck: data.skipPreferenceCheck === true,
        _fromQueue: true,
      });
    }

    case JOB_TYPES.PUSH: {
      return await pushService.sendToUser(data.userId, {
        title: data.title,
        body: data.body || data.message,
        data: data.data || data.metadata || {},
        event: data.event,
      });
    }

    case JOB_TYPES.EMAIL: {
      if (typeof emailService[data.method] === "function") {
        return await emailService[data.method](data.payload || data.args || {});
      }
      if (data.to && data.subject) {
        return await emailService.send({
          to: data.to,
          subject: data.subject,
          html: data.html,
          attachments: data.attachments,
          userId: data.userId,
        });
      }
      logger.warn(`Unknown email job payload for job ${job.id}`);
      return null;
    }

    case JOB_TYPES.SMS: {
      if (typeof smsService[data.method] === "function") {
        return await smsService[data.method](data.payload || {});
      }
      if (data.to && data.message) {
        return await smsService.sendSms({
          to: data.to,
          message: data.message,
          userId: data.userId,
        });
      }
      logger.warn(`Unknown SMS job payload for job ${job.id}`);
      return null;
    }

    default:
      logger.warn(`Unhandled notification job type: ${name}`);
      return null;
  }
}

/**
 * Start the BullMQ notification worker (no-op without Redis).
 */
export function startNotificationWorker() {
  if (worker) return worker;
  if (!isQueueEnabled()) {
    logger.info("Notification worker skipped — REDIS_URL not set.");
    return null;
  }

  const connection = getBullmqConnection();
  if (!connection) return null;

  try {
    worker = new Worker(QUEUE_NAMES.NOTIFICATIONS, processJob, {
      connection,
      concurrency: Number(process.env.NOTIFICATION_WORKER_CONCURRENCY) || 5,
    });

    worker.on("completed", (job) => {
      logger.info(`Notification job completed: ${job.name} (${job.id})`);
    });

    worker.on("failed", (job, err) => {
      logger.warn(
        `Notification job failed: ${job?.name} (${job?.id}) — ${err.message}`
      );
    });

    worker.on("error", (err) => {
      logger.warn(`Notification worker error: ${err.message}`);
    });

    logger.info("BullMQ notification worker started.");
    return worker;
  } catch (error) {
    logger.warn(`Failed to start notification worker: ${error.message}`);
    return null;
  }
}

export async function stopNotificationWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }
}

export default startNotificationWorker;
