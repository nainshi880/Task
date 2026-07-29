import "./config/checkEnv.js";

import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import ensureIndexes from "./config/ensureIndexes.js";
import { initChatSocket } from "./sockets/chat.socket.js";
import { setIO } from "./sockets/io.js";
import { initFirebase } from "./config/firebase.js";
import { startCronJobs } from "./jobs/index.js";
import { startPaymentRetryWorker } from "./workers/paymentRetry.worker.js";
import { closePaymentRetryQueue } from "./queues/paymentRetry.queue.js";
import { closeRedis } from "./config/redis.js";
import { seedSuperAdmin } from "./seeds/seedSuperAdmin.js";
import { seedAdmin } from "./seeds/seedAdmin.js";
import subscriptionPlanRepository from "./repositories/subscriptionPlan.repository.js";
import logger, { errorLogger } from "./utils/logger.js";

const PORT = process.env.PORT || 5000;

await connectDB();
await ensureIndexes();
await seedSuperAdmin();
await seedAdmin();
await subscriptionPlanRepository.ensureDefaultPlans();

initFirebase();

const server = http.createServer(app);
const io = await initChatSocket(server);

setIO(io);
app.set("io", io);

startCronJobs();
startPaymentRetryWorker();

async function gracefulShutdown(signal) {
  logger.info(`${signal} received — shutting down`);
  try {
    await closePaymentRetryQueue();
    await closeRedis();
  } catch (error) {
    logger.warn(`Shutdown cleanup error: ${error.message}`);
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
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

server.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info("Socket.IO ready at path /socket.io");
});
