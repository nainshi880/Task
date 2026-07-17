import Booking from "../models/Booking.js";
import BOOKING_STATUS from "../constants/bookingStatus.js";
import NOTIFICATION_TYPES from "../constants/notificationType.js";
import notificationService from "../services/notification.service.js";
import logger from "../utils/logger.js";

const REMINDER_STATUSES = [
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.IN_PROGRESS,
];

export async function runBookingReminderJob() {
  const tomorrowStart = new Date();
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  const bookings = await Booking.find({
    bookingDate: { $gte: tomorrowStart, $lt: tomorrowEnd },
    status: { $in: REMINDER_STATUSES },
  })
    .select("serviceName bookingDate bookingTime customer technician status")
    .populate("customer", "name email")
    .populate("technician", "name email")
    .lean();

  let sent = 0;

  for (const booking of bookings) {
    const dateLabel = booking.bookingDate
      ? new Date(booking.bookingDate).toISOString().slice(0, 10)
      : "tomorrow";
    const timeLabel = booking.bookingTime || "";

    if (booking.customer?._id) {
      await notificationService.notify({
        userId: booking.customer._id,
        title: "Upcoming service reminder",
        message: `Your ${booking.serviceName} service is scheduled for ${dateLabel}${timeLabel ? ` at ${timeLabel}` : ""}.`,
        type: NOTIFICATION_TYPES.BOOKING,
        bookingId: booking._id,
        metadata: { reminderType: "upcoming_booking", role: "customer" },
        jobId: `reminder:customer:${booking._id}:${dateLabel}`,
      });
      sent += 1;
    }

    if (booking.technician?._id) {
      await notificationService.notify({
        userId: booking.technician._id,
        title: "Job reminder",
        message: `You have a ${booking.serviceName} job scheduled for ${dateLabel}${timeLabel ? ` at ${timeLabel}` : ""}.`,
        type: NOTIFICATION_TYPES.BOOKING,
        bookingId: booking._id,
        metadata: { reminderType: "upcoming_booking", role: "technician" },
        jobId: `reminder:technician:${booking._id}:${dateLabel}`,
      });
      sent += 1;
    }
  }

  logger.info("booking_reminder_job_completed", {
    bookingsChecked: bookings.length,
    notificationsSent: sent,
  });

  return { bookingsChecked: bookings.length, notificationsSent: sent };
}

export default runBookingReminderJob;
