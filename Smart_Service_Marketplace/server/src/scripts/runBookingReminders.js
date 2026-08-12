/**
 * Manually run booking reminder jobs (for local testing).
 *
 * Usage:
 *   node src/scripts/runBookingReminders.js
 *   node src/scripts/runBookingReminders.js morning_of
 *   node src/scripts/runBookingReminders.js day_before
 */
import "../config/env.js";
import connectDB from "../config/db.js";
import {
  runDayBeforeBookingReminderJob,
  runMorningOfBookingReminderJob,
  runBookingReminderJob,
} from "../jobs/notification.job.js";
import logger from "../utils/logger.js";

async function main() {
  const kind = String(process.argv[2] || "all").trim().toLowerCase();

  await connectDB();

  const results = [];

  if (kind === "all" || kind === "morning_of") {
    results.push(await runMorningOfBookingReminderJob());
  }
  if (kind === "all" || kind === "day_before") {
    results.push(await runDayBeforeBookingReminderJob());
  }
  if (kind !== "all" && kind !== "morning_of" && kind !== "day_before") {
    results.push(await runBookingReminderJob(kind));
  }

  logger.info("manual_booking_reminders_done", { results });
  console.log(JSON.stringify({ ok: true, results }, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
