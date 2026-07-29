import { Worker } from "bullmq";
import { getBullMqConnection, isRedisConfigured } from "../config/redis.js";
import { PAYMENT_AUTO_RETRY } from "../constants/paymentRetry.js";
import paymentRetryService from "../services/paymentRetry.service.js";
import logger from "../utils/logger.js";

let worker = null;

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

  worker = new Worker(
    PAYMENT_AUTO_RETRY.QUEUE_NAME,
    async (job) => paymentRetryService.processRetryJob(job),
    {
      connection,
      concurrency: PAYMENT_AUTO_RETRY.WORKER_CONCURRENCY,
      limiter: {
        max: PAYMENT_AUTO_RETRY.QUEUE_MAX_PER_SECOND,
        duration: 1000,
      },
    }
  );

  worker.on("completed", (job, result) => {
    logger.info("Payment retry job completed", {
      jobId: job.id,
      paymentId: job.data?.paymentId,
      attempt: job.data?.attempt,
      result,
    });
  });

  worker.on("failed", (job, error) => {
    logger.error("Payment retry job failed", {
      jobId: job?.id,
      paymentId: job?.data?.paymentId,
      attempt: job?.data?.attempt,
      message: error.message,
    });
  });

  worker.on("error", (error) => {
    logger.warn(`Payment retry worker error: ${error.message}`);
  });

  logger.info(
    `Payment retry worker started (concurrency=${PAYMENT_AUTO_RETRY.WORKER_CONCURRENCY})`
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
