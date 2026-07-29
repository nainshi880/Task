import { Queue } from "bullmq";
import { getBullMqConnection, isRedisConfigured } from "../config/redis.js";
import {
  PAYMENT_AUTO_RETRY,
  buildRetryJobId,
  getAutoRetryDelayMs,
} from "../constants/paymentRetry.js";
import logger from "../utils/logger.js";

let paymentRetryQueue = null;

export function getPaymentRetryQueue() {
  if (!isRedisConfigured()) {
    return null;
  }

  if (paymentRetryQueue) {
    return paymentRetryQueue;
  }

  const connection = getBullMqConnection();
  if (!connection) return null;

  paymentRetryQueue = new Queue(PAYMENT_AUTO_RETRY.QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 500 },
      attempts: 1,
    },
  });

  paymentRetryQueue.on("error", (error) => {
    logger.warn(`Payment retry queue error: ${error.message}`);
  });

  return paymentRetryQueue;
}

/**
 * Enqueue a single auto-retry attempt with exponential backoff delay.
 * jobId enforces queue-level idempotency for the same payment/day/attempt.
 */
export async function enqueuePaymentRetryJob({
  paymentId,
  attempt,
  dayKey,
  idempotencyKey,
  reason = "",
  trigger = "webhook",
}) {
  const queue = getPaymentRetryQueue();
  if (!queue) {
    logger.warn(
      "Payment retry queue unavailable (set REDIS_URL). Skipping enqueue."
    );
    return { queued: false, reason: "redis_unavailable" };
  }

  const jobId = buildRetryJobId(paymentId, dayKey, attempt);
  const delay = getAutoRetryDelayMs(attempt);

  try {
      const existingJob = await queue.getJob(jobId);
    if (existingJob) {
      logger.info("Payment retry job already queued (idempotent)", {
        jobId,
        paymentId: String(paymentId),
        attempt,
      });
      return { queued: false, reason: "duplicate_job", jobId };
    }

    const job = await queue.add(
      "retry-charge",
      {
        paymentId: String(paymentId),
        attempt,
        dayKey,
        idempotencyKey,
        reason,
        trigger,
        enqueuedAt: new Date().toISOString(),
      },
      {
        jobId,
        delay,
        removeOnComplete: true, // cleans up completed jobs from Redis
        removeOnFail: false,
      }
    );

    logger.info("Payment retry job enqueued", {
      jobId: job.id,
      paymentId: String(paymentId),
      attempt,
      delayMs: delay,
    });

    return { queued: true, jobId: job.id, delayMs: delay };
  } catch (error) {
    // BullMQ throws when jobId already exists
    if (/already exists|Job .* exists/i.test(error.message)) {
      logger.info("Payment retry job already queued (idempotent)", {
        jobId,
        paymentId: String(paymentId),
        attempt,
      });
      return { queued: false, reason: "duplicate_job", jobId };
    }
    throw error;
  }
}

export async function closePaymentRetryQueue() {
  if (!paymentRetryQueue) return;
  await paymentRetryQueue.close();
  paymentRetryQueue = null;
}

export default {
  getPaymentRetryQueue,
  enqueuePaymentRetryJob,
  closePaymentRetryQueue,
};
