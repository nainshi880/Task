import "./config/checkEnv.js";

import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import ensureIndexes from "./config/ensureIndexes.js";
import { initChatSocket } from "./sockets/chat.socket.js";
import { setIO } from "./sockets/io.js";
import { initFirebase } from "./config/firebase.js";
import { startCronJobs } from "./jobs/index.js";
import { startPaymentRetryWorker, stopPaymentRetryWorker } from "./workers/paymentRetry.worker.js";
import { startNotificationWorker, stopNotificationWorker } from "./workers/notification.worker.js";
import { closePaymentRetryQueue } from "./queues/paymentRetry.queue.js";
import { closeNotificationQueue } from "./queues/notification.queue.js";
import { closeRedis } from "./config/redis.js";
import { seedSuperAdmin } from "./seeds/seedSuperAdmin.js";
import { seedAdmin } from "./seeds/seedAdmin.js";
import subscriptionPlanRepository from "./repositories/subscriptionPlan.repository.js";
import {
  getProcessRole,
  isApiProcess,
  isPaymentWorkerProcess,
  isNotificationWorkerProcess,
  shouldRunCron,
  PROCESS_ROLE,
} from "./constants/processRole.js";
import logger, { errorLogger } from "./utils/logger.js";

const PORT = process.env.PORT || 5000;
const role = getProcessRole();

await connectDB();

if (isApiProcess(role)) {
  await ensureIndexes();
  await seedSuperAdmin();
  await seedAdmin();
  await subscriptionPlanRepository.ensureDefaultPlans();
}

initFirebase();

let server = null;

if (isApiProcess(role)) {
  server = http.createServer(app);
  const io = await initChatSocket(server);
  setIO(io);
  app.set("io", io);

  if (shouldRunCron(role)) {
    startCronJobs();
  }

  // Monolith/dev (PROCESS_ROLE=all): run workers in-process.
  // Clustered API (PROCESS_ROLE=api): enqueue only — workers run as separate fleets.
  if (role === PROCESS_ROLE.ALL) {
    startPaymentRetryWorker();
    startNotificationWorker();
  }

  server.listen(PORT, () => {
    logger.info(`API server running on http://localhost:${PORT} (role=${role})`);
    logger.info("Socket.IO ready at path /socket.io");
  });
} else if (isPaymentWorkerProcess(role)) {
  startPaymentRetryWorker();
  logger.info(`Payment-retry worker process ready (role=${role})`);
} else if (isNotificationWorkerProcess(role)) {
  startNotificationWorker();
  logger.info(`Notification worker process ready (role=${role})`);
} else {
  logger.error(`Unknown PROCESS_ROLE=${role}`);
  process.exit(1);
}

async function gracefulShutdown(signal) {
  logger.info(`${signal} received — shutting down (role=${role})`);
  try {
    await stopPaymentRetryWorker();
    await stopNotificationWorker();
    await closePaymentRetryQueue();
    await closeNotificationQueue();
    await closeRedis();
  } catch (error) {
    logger.warn(`Shutdown cleanup error: ${error.message}`);
  }

  if (server) {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  errorLogger.error("uncaught_exception", {
    message: error.message,
    stack: error.stack,
  });
  logger.error(`Uncaught exception: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  const message =
    reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  errorLogger.error("unhandled_rejection", { message, stack });
  logger.error(`Unhandled rejection: ${message}`, { stack });
});
