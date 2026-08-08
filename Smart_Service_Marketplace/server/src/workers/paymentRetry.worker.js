import { Worker } from "bullmq";
import { getBullMqConnection, isRedisConfigured } from "../config/redis.js";
import { PAYMENT_AUTO_RETRY } from "../constants/paymentRetry.js";
import paymentRetryService from "../services/paymentRetry.service.js";
import { moveFailedJobToDeadLetter } from "../queues/deadLetter.queue.js";
import metricsStore from "../utils/metrics.js";
import logger from "../utils/logger.js";

let worker = null;

function withJobTimeout(promise, timeoutMs, jobId) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(
        `Job execution timed out after ${timeoutMs}ms`
      );
      error.code = "JOB_TIMEOUT";
      error.jobId = jobId;
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

export function startPaymentRetryWorker() {
  if (!isRedisConfigured()) {
    logger.info(
      "Payment retry worker not started (REDIS_URL missing). Set REDIS_URL to enable BullMQ retries."
    );
    return null;
  }

  if (process.env.PAYMENT_RETRY_ENABLED === "false") {
    logger.info("Payment retry worker disabled (PAYMENT_RETRY_ENABLED=false).");
    return null;
  }

  if (worker) return worker;

  const connection = getBullMqConnection();
  if (!connection) return null;

  const concurrency = PAYMENT_AUTO_RETRY.WORKER_CONCURRENCY;
  const lockDuration = PAYMENT_AUTO_RETRY.LOCK_DURATION_MS;
  const jobTimeoutMs = PAYMENT_AUTO_RETRY.JOB_TIMEOUT_MS;

  worker = new Worker(
    PAYMENT_AUTO_RETRY.QUEUE_NAME,
    async (job) => {
      try {
        return await withJobTimeout(
          paymentRetryService.processRetryJob(job),
          jobTimeoutMs,
          job.id
        );
      } catch (error) {
        // Always log + rethrow so BullMQ marks the job failed and frees the slot.
        logger.error("Payment retry job handler error", {
          jobId: job?.id,
          paymentId: job?.data?.paymentId,
          attempt: job?.data?.attempt,
          code: error.code || null,
          message: error.message,
        });
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    {
      connection,
      concurrency,
      lockDuration,
      limiter: {
        max: PAYMENT_AUTO_RETRY.QUEUE_MAX_PER_SECOND,
        duration: 1000,
      },
    }
  );

  worker.on("completed", (job, result) => {
    metricsStore.recordQueueEvent(PAYMENT_AUTO_RETRY.QUEUE_NAME, "completed");
    logger.info("Payment retry job completed", {
      jobId: job.id,
      paymentId: job.data?.paymentId,
      attempt: job.data?.attempt,
      result,
    });
  });

  worker.on("failed", async (job, error) => {
    metricsStore.recordQueueEvent(PAYMENT_AUTO_RETRY.QUEUE_NAME, "failed");
    logger.error("Payment retry job failed", {
      jobId: job?.id,
      paymentId: job?.data?.paymentId,
      attempt: job?.data?.attempt,
      attemptsMade: job?.attemptsMade,
      message: error.message,
    });

    try {
      await moveFailedJobToDeadLetter(
        PAYMENT_AUTO_RETRY.QUEUE_NAME,
        job,
        error
      );
    } catch (dlqError) {
      logger.warn(`DLQ move failed: ${dlqError.message}`);
    }
  });

  worker.on("error", (error) => {
    logger.warn(`Payment retry worker error: ${error.message}`);
  });

  logger.info(
    `Payment retry worker started (concurrency=${concurrency}, lockDuration=${lockDuration}ms, jobTimeout=${jobTimeoutMs}ms)`
  );

  return worker;
}

export async function stopPaymentRetryWorker() {
  if (!worker) return;
  await worker.close();
  worker = null;
}

export default {
  startPaymentRetryWorker,
  stopPaymentRetryWorker,
};
