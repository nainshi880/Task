import Booking from "../models/Booking.js";
import BOOKING_STATUS from "../constants/bookingStatus.js";
import NOTIFICATION_TYPES from "../constants/notificationType.js";
import platformSettingsService from "../services/platformSettings.service.js";
import {
  queueInAppNotification,
  queuePushNotification,
  queueSocketEmit,
} from "../services/notificationQueue.service.js";
import logger from "../utils/logger.js";

/** Upcoming jobs that still need the technician to show up */
const TECHNICIAN_REMINDER_STATUSES = [
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.ACCEPTED,
];

/** Customers care about any booking still headed to service day */
const CUSTOMER_REMINDER_STATUSES = [
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.IN_PROGRESS,
];

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateLabel(bookingDate) {
  if (!bookingDate) return "";
  return new Date(bookingDate).toISOString().slice(0, 10);
}

function formatScheduleLabel(booking) {
  const dateLabel = formatDateLabel(booking.bookingDate) || "the scheduled date";
  const timeLabel = booking.bookingTime ? ` at ${booking.bookingTime}` : "";
  return `${dateLabel}${timeLabel}`;
}

async function remindersEnabled() {
  try {
    const settings = await platformSettingsService.getSettings();
    return settings?.notifications?.bookingReminders !== false;
  } catch {
    return true;
  }
}

async function sendTechnicianReminder(booking, { kind }) {
  const technicianId = booking.technician?._id || booking.technician;
  if (!technicianId) return false;

  const schedule = formatScheduleLabel(booking);
  const service = booking.serviceName || booking.serviceCategory || "service";
  const dateKey = formatDateLabel(booking.bookingDate) || kind;
  const actionUrl = `/technician/jobs/${booking._id}`;

  const isMorningOf = kind === "morning_of";
  const title = isMorningOf ? "Job today" : "Upcoming job reminder";
  const message = isMorningOf
    ? `Reminder: your ${service} job is today${booking.bookingTime ? ` at ${booking.bookingTime}` : ""}. Please be ready on time.`
    : `Reminder: you have a ${service} job scheduled for ${schedule}.`;

  const dedupeKey = `reminder:technician:${booking._id}:${kind}:${dateKey}`;

  await queueInAppNotification({
    userId: technicianId,
    title,
    message,
    type: NOTIFICATION_TYPES.BOOKING,
    bookingId: booking._id,
    actionUrl,
    priority: "high",
    metadata: {
      reminderType: kind,
      role: "technician",
      bookingDate: dateKey,
      bookingTime: booking.bookingTime || "",
    },
  });

  await queuePushNotification({
    userId: technicianId,
    title,
    body: message,
    data: {
      type: "booking_reminder",
      reminderType: kind,
      bookingId: String(booking._id),
      actionUrl,
      link: actionUrl,
      deeplink: actionUrl,
    },
    dedupeKey: `${dedupeKey}:push`,
  });

  await queueSocketEmit({
    userId: technicianId,
    event: "notification:new",
    payload: {
      type: NOTIFICATION_TYPES.BOOKING,
      title,
      message,
      actionUrl,
      bookingId: String(booking._id),
      reminderType: kind,
    },
  });

  return true;
}

async function sendCustomerReminder(booking, { kind }) {
  const customerId = booking.customer?._id || booking.customer;
  if (!customerId) return false;

  const schedule = formatScheduleLabel(booking);
  const service = booking.serviceName || booking.serviceCategory || "service";
  const dateKey = formatDateLabel(booking.bookingDate) || kind;
  const actionUrl = `/bookings/${booking._id}`;

  const isMorningOf = kind === "morning_of";
  const title = isMorningOf ? "Service today" : "Upcoming service reminder";
  const message = isMorningOf
    ? `Your ${service} service is today${booking.bookingTime ? ` at ${booking.bookingTime}` : ""}.`
    : `Your ${service} service is scheduled for ${schedule}.`;

  await queueInAppNotification({
    userId: customerId,
    title,
    message,
    type: NOTIFICATION_TYPES.BOOKING,
    bookingId: booking._id,
    actionUrl,
    metadata: {
      reminderType: kind,
      role: "customer",
      bookingDate: dateKey,
      bookingTime: booking.bookingTime || "",
    },
  });

  await queuePushNotification({
    userId: customerId,
    title,
    body: message,
    data: {
      type: "booking_reminder",
      reminderType: kind,
      bookingId: String(booking._id),
      actionUrl,
      link: actionUrl,
      deeplink: actionUrl,
    },
    dedupeKey: `reminder:customer:${booking._id}:${kind}:${dateKey}:push`,
  });

  await queueSocketEmit({
    userId: customerId,
    event: "notification:new",
    payload: {
      type: NOTIFICATION_TYPES.BOOKING,
      title,
      message,
      actionUrl,
      bookingId: String(booking._id),
      reminderType: kind,
    },
  });

  return true;
}

/**
 * @param {"day_before"|"morning_of"} kind
 */
export async function runBookingReminderJob(kind = "day_before") {
  if (!(await remindersEnabled())) {
    logger.info("booking_reminder_job_skipped", {
      reason: "bookingReminders_disabled",
      kind,
    });
    return { skipped: true, kind, bookingsChecked: 0, notificationsSent: 0 };
  }

  const today = startOfDay();
  const windowStart =
    kind === "morning_of" ? today : addDays(today, 1);
  const windowEnd = addDays(windowStart, 1);

  const statuses =
    kind === "morning_of"
      ? TECHNICIAN_REMINDER_STATUSES
      : [
          ...new Set([
            ...TECHNICIAN_REMINDER_STATUSES,
            ...CUSTOMER_REMINDER_STATUSES,
          ]),
        ];

  const bookings = await Booking.find({
    bookingDate: { $gte: windowStart, $lt: windowEnd },
    status: { $in: statuses },
  })
    .select(
      "serviceName serviceCategory bookingDate bookingTime customer technician status"
    )
    .populate("customer", "name email")
    .populate("technician", "name email")
    .lean();

  let sent = 0;

  for (const booking of bookings) {
    const status = booking.status;

    // Technician: assigned/accepted upcoming jobs
    if (
      booking.technician &&
      TECHNICIAN_REMINDER_STATUSES.includes(status)
    ) {
      const ok = await sendTechnicianReminder(booking, { kind });
      if (ok) sent += 1;
    }

    // Customer: day-before + morning-of for active upcoming bookings
    if (
      booking.customer &&
      CUSTOMER_REMINDER_STATUSES.includes(status)
    ) {
      const ok = await sendCustomerReminder(booking, { kind });
      if (ok) sent += 1;
    }
  }

  logger.info("booking_reminder_job_completed", {
    kind,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    bookingsChecked: bookings.length,
    notificationsSent: sent,
  });

  return {
    kind,
    bookingsChecked: bookings.length,
    notificationsSent: sent,
  };
}

/** Day-before service (runs ~08:00) */
export async function runDayBeforeBookingReminderJob() {
  return runBookingReminderJob("day_before");
}

/** Morning of service day (runs ~07:00) */
export async function runMorningOfBookingReminderJob() {
  return runBookingReminderJob("morning_of");
}

export default runDayBeforeBookingReminderJob;
