import { Worker } from "bullmq";
import { getBullMqConnection, isRedisConfigured } from "../config/redis.js";
import { NOTIFICATION_QUEUE } from "../constants/notificationQueue.js";
import notificationService from "../services/notification.service.js";
import emailService from "../services/email.service.js";
import pushService from "../services/push.service.js";
import { getIO } from "../sockets/io.js";
import { moveFailedJobToDeadLetter } from "../queues/deadLetter.queue.js";
import metricsStore from "../utils/metrics.js";
import logger from "../utils/logger.js";

let worker = null;

async function processNotificationJob(job) {
  const type = job.name || job.data?.type;
  const data = job.data || {};

  switch (type) {
    case NOTIFICATION_QUEUE.JOBS.IN_APP: {
      return notificationService.notify({
        ...data,
        _fromQueue: true,
      });
    }

    case NOTIFICATION_QUEUE.JOBS.PUSH: {
      return pushService.sendToUser(data.userId, {
        title: data.title,
        body: data.body || data.message,
        data: data.data || {},
      });
    }

    case NOTIFICATION_QUEUE.JOBS.EMAIL: {
      if (data.method && typeof emailService[data.method] === "function") {
        return emailService[data.method](data.payload || data.args || {});
      }
      if (data.to && data.subject) {
        return emailService.send({
          to: data.to,
          subject: data.subject,
          html: data.html,
          attachments: data.attachments,
          userId: data.userId,
        });
      }
      throw new Error("Invalid email notification job payload.");
    }

    case NOTIFICATION_QUEUE.JOBS.SOCKET: {
      const io = getIO();
      if (!io) {
        return { sent: false, reason: "socket_io_unavailable" };
      }
      const room = data.room || (data.userId ? `user:${data.userId}` : null);
      if (!room || !data.event) {
        throw new Error("socket_emit requires room/userId and event.");
      }
      io.to(room).emit(data.event, data.payload || {});
      return { sent: true, room, event: data.event };
    }

    default:
      throw new Error(`Unknown notification job type: ${type}`);
  }
}

export function startNotificationWorker() {
  if (!isRedisConfigured()) {
    logger.info(
      "Notification worker not started (REDIS_URL missing)."
    );
    return null;
  }

  if (worker) return worker;

  const connection = getBullMqConnection();
  if (!connection) return null;

  worker = new Worker(NOTIFICATION_QUEUE.NAME, processNotificationJob, {
    connection,
    concurrency: NOTIFICATION_QUEUE.WORKER_CONCURRENCY,
    limiter: {
      max: NOTIFICATION_QUEUE.QUEUE_MAX_PER_SECOND,
      duration: 1000,
    },
  });

  worker.on("completed", (job) => {
    metricsStore.recordQueueEvent(NOTIFICATION_QUEUE.NAME, "completed");
    logger.debug("Notification job completed", {
      jobId: job.id,
      type: job.name,
    });
  });

  worker.on("failed", async (job, error) => {
    metricsStore.recordQueueEvent(NOTIFICATION_QUEUE.NAME, "failed");
    logger.warn("Notification job failed", {
      jobId: job?.id,
      type: job?.name,
      attemptsMade: job?.attemptsMade,
      message: error.message,
    });

    try {
      await moveFailedJobToDeadLetter(NOTIFICATION_QUEUE.NAME, job, error);
    } catch (dlqError) {
      logger.warn(`DLQ move failed: ${dlqError.message}`);
    }
  });

  worker.on("error", (error) => {
    logger.warn(`Notification worker error: ${error.message}`);
  });

  logger.info(
    `Notification worker started (concurrency=${NOTIFICATION_QUEUE.WORKER_CONCURRENCY})`
  );

  return worker;
}

export async function stopNotificationWorker() {
  if (!worker) return;
  await worker.close();
  worker = null;
}

export default {
  startNotificationWorker,
  stopNotificationWorker,
};
