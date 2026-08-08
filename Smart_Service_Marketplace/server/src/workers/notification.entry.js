/**
 * Notification / push / email worker entrypoint (horizontal scale).
 *   npm run start:worker:notifications
 */
process.env.PROCESS_ROLE = process.env.PROCESS_ROLE || "notification-worker";

await import("../config/checkEnv.js");
const { default: connectDB } = await import("../config/db.js");
const { initFirebase } = await import("../config/firebase.js");
const { closeRedis, isRedisConfigured } = await import("../config/redis.js");
const {
  startNotificationWorker,
  stopNotificationWorker,
} = await import("./notification.worker.js");
const { closeNotificationQueue } = await import(
  "../queues/notification.queue.js"
);
const loggerModule = await import("../utils/logger.js");
const logger = loggerModule.default;
const { errorLogger } = loggerModule;

await connectDB();
initFirebase();

if (!isRedisConfigured()) {
  logger.error("REDIS_URL is required for the notification worker.");
  process.exit(1);
}

startNotificationWorker();
logger.info("Notification worker process ready");

async function shutdown(signal) {
  logger.info(`${signal} received — stopping notification worker`);
  try {
    await stopNotificationWorker();
    await closeNotificationQueue();
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
