import cron from "node-cron";
import logger from "../utils/logger.js";
import runCleanupJob from "./cleanup.job.js";
import {
  runDayBeforeBookingReminderJob,
  runMorningOfBookingReminderJob,
} from "./notification.job.js";

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

  // Technician (and customer) reminders before / on the scheduled service day.
  // Times use the server's local timezone.
  scheduleJob(
    "0 7 * * *",
    "booking_reminders_morning_of",
    runMorningOfBookingReminderJob
  );
  scheduleJob(
    "0 8 * * *",
    "booking_reminders_day_before",
    runDayBeforeBookingReminderJob
  );

  logger.info("Production cron jobs started.");
}

export default startCronJobs;
