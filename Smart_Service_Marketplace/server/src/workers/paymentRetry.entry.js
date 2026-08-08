/**
 * Payment-retry worker entrypoint (horizontal scale).
 *   npm run start:worker:payment-retry
 */
process.env.PROCESS_ROLE = process.env.PROCESS_ROLE || "payment-worker";

const { default: connectDB } = await import("../config/db.js");
await import("../config/checkEnv.js");
const { initFirebase } = await import("../config/firebase.js");
const { closeRedis, isRedisConfigured } = await import("../config/redis.js");
const {
  startPaymentRetryWorker,
  stopPaymentRetryWorker,
} = await import("./paymentRetry.worker.js");
const { closePaymentRetryQueue } = await import(
  "../queues/paymentRetry.queue.js"
);
const loggerModule = await import("../utils/logger.js");
const logger = loggerModule.default;
const { errorLogger } = loggerModule;

await connectDB();
initFirebase();

if (!isRedisConfigured()) {
  logger.error("REDIS_URL is required for the payment-retry worker.");
  process.exit(1);
}

startPaymentRetryWorker();
logger.info("Payment-retry worker process ready");

async function shutdown(signal) {
  logger.info(`${signal} received — stopping payment-retry worker`);
  try {
    await stopPaymentRetryWorker();
    await closePaymentRetryQueue();
    await closeRedis();
  } catch (error) {
    logger.warn(`Worker shutdown error: ${error.message}`);
  }
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  errorLogger.error("uncaught_exception", {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  errorLogger.error("unhandled_rejection", { message });
});
