import cron from "node-cron";
import logger from "../utils/logger.js";
import runCleanupJob from "./cleanup.job.js";
import runBookingReminderJob from "./notification.job.js";

function scheduleJob(expression, name, handler) {
  cron.schedule(expression, async () => {
    try {
      await handler();
    } catch (error) {
      logger.error(`Cron job failed (${name}): ${error.message}`, {
        stack: error.stack,
      });
    }
  });

  logger.info(`Cron scheduled: ${name} (${expression})`);
}

export function startCronJobs() {
  if (process.env.CRON_ENABLED === "false") {
    logger.info("Cron jobs disabled (CRON_ENABLED=false).");
    return;
  }

  scheduleJob("0 3 * * *", "cleanup", runCleanupJob);
  scheduleJob("0 8 * * *", "booking_reminders", runBookingReminderJob);

  logger.info("Production cron jobs started.");
}

export default startCronJobs;
