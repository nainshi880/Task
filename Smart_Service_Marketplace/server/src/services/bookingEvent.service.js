import auditRepository from "../repositories/audit.repository.js";
import bookingTimelineRepository from "../repositories/bookingTimeline.repository.js";
import Booking from "../models/Booking.js";
import cacheService, { CACHE_KEYS } from "../utils/cache.js";
import { invalidateAdminAnalytics } from "../utils/cacheInvalidation.js";
import notificationService from "./notification.service.js";
import emailService from "./email.service.js";
import BOOKING_TIMELINE_EVENT from "../constants/bookingTimelineEvent.js";
import logger from "../utils/logger.js";
import User from "../models/User.js";

const BOOKING_NOTIFY_COPY = {
  CREATED: {
    title: "Booking created",
    message: (b) =>
      `Your booking for ${b.serviceName} has been created successfully.`,
    notify: ["customer"],
  },
  ASSIGNED: {
    title: "Technician assigned",
    message: (b) =>
      `A technician has been assigned to your ${b.serviceName} booking.`,
    // Technician notify + socket live in assignment.service (centralized).
    notify: ["customer"],
  },
  REASSIGNED: {
    title: "Technician reassigned",
    message: (b) =>
      `Your ${b.serviceName} booking has been reassigned to another technician.`,
    notify: ["customer"],
  },
  ACCEPTED: {
    title: "Booking accepted",
    message: (b) =>
      `Your ${b.serviceName} booking was accepted by the technician.`,
    notify: ["customer"],
  },
  REJECTED: {
    title: "Booking rejected",
    message: (b) =>
      `Your ${b.serviceName} booking was rejected. We will reassign shortly.`,
    notify: ["customer"],
  },
  ARRIVING: {
    title: "Technician arriving",
    message: (b) =>
      `Your technician is on the way for ${b.serviceName}.`,
    notify: ["customer"],
  },
  STARTED: {
    title: "Work started",
    message: (b) => `Work has started on your ${b.serviceName} booking.`,
    notify: ["customer"],
  },
  COMPLETED: {
    title: "Work completed",
    message: (b) =>
      `Your ${b.serviceName} booking has been marked as completed.`,
    notify: ["customer"],
  },
  CUSTOMER_CONFIRMED: {
    title: "Booking confirmed",
    message: (b) => `You confirmed completion of ${b.serviceName}.`,
    notify: ["customer", "technician"],
    techTitle: "Customer confirmed job",
    techMessage: (b) =>
      `Customer confirmed completion of ${b.serviceName}.`,
  },
  CLOSED: {
    title: "Booking closed",
    message: (b) => `Your ${b.serviceName} booking has been closed.`,
    notify: ["customer"],
  },
  CANCELLED: {
    title: "Booking cancelled",
    message: (b) => `Your ${b.serviceName} booking was cancelled.`,
    notify: ["customer", "technician"],
    techTitle: "Job cancelled",
    techMessage: (b) =>
      `A ${b.serviceName} job assigned to you was cancelled.`,
  },
  PAUSED: {
    title: "Work paused",
    message: (b) => `Work on your ${b.serviceName} booking was paused.`,
    notify: ["customer"],
  },
  RESUMED: {
    title: "Work resumed",
    message: (b) => `Work on your ${b.serviceName} booking has resumed.`,
    notify: ["customer"],
  },
};

class BookingEventService {
  async record({
    bookingId,
    event,
    actorId,
    actorRole,
    action,
    fromStatus = null,
    toStatus = null,
    note = "",
    metadata = {},
    ipAddress,
    userAgent,
    session = null,
  }) {
    const tasks = [];

    tasks.push(
      bookingTimelineRepository.create(
        {
          booking: bookingId,
          event,
          actor: actorId || null,
          actorRole,
          fromStatus,
          toStatus,
          note,
          metadata,
        },
        session
      )
    );

    if (actorId && action) {
      tasks.push(
        auditRepository.create({
          actor: actorId,
          action,
          resource: "Booking",
          resourceId: bookingId,
          description: note || `${action} booking`,
          metadata: {
            event,
            fromStatus,
            toStatus,
            ...metadata,
          },
          ipAddress,
          userAgent,
        })
      );
    }

    await Promise.allSettled(tasks);
    await this.invalidateBookingCache(bookingId);
    await this.emitBookingNotifications(bookingId, event, metadata);
  }

  async emitBookingNotifications(bookingId, event, metadata = {}) {
    try {
      const copy = BOOKING_NOTIFY_COPY[event];
      if (!copy) return;

      const booking = await Booking.findById(bookingId).select(
        "customer technician serviceName status"
      );
      if (!booking) return;

      const jobs = [];

      if (copy.notify.includes("customer") && booking.customer) {
        jobs.push(
          notificationService.notifyBooking(booking.customer, {
            title: copy.title,
            message: copy.message(booking),
            bookingId: booking._id,
            metadata: { event, ...metadata },
          })
        );
      }

      if (copy.notify.includes("technician") && booking.technician) {
        jobs.push(
          notificationService.notifyBooking(booking.technician, {
            title: copy.techTitle || copy.title,
            message: (copy.techMessage || copy.message)(booking),
            bookingId: booking._id,
            metadata: { event, ...metadata },
          })
        );
      }

      jobs.push(this.emitEmailForEvent(event, booking, metadata));

      await Promise.allSettled(jobs);
    } catch (error) {
      logger.warn(`Booking notification failed: ${error.message}`);
    }
  }

  async emitEmailForEvent(event, booking, metadata = {}) {
    try {
      const customer = await User.findById(booking.customer).select(
        "name email phone"
      );
      if (!customer) return null;

      switch (event) {
        case BOOKING_TIMELINE_EVENT.CREATED:
          return emailService.sendBookingConfirmation({
            user: customer,
            booking,
          });

        case BOOKING_TIMELINE_EVENT.CANCELLED:
          return emailService.sendBookingCancelled({
            user: customer,
            booking,
            reason: metadata.reason || metadata.note || "",
          });

        case BOOKING_TIMELINE_EVENT.ARRIVING:
          return emailService.sendBookingUpdate({
            user: customer,
            booking,
            updateTitle: "Technician Arriving",
            updateMessage: `Your technician is on the way for ${booking.serviceName}.`,
          });

        case BOOKING_TIMELINE_EVENT.ASSIGNED:
        case BOOKING_TIMELINE_EVENT.ACCEPTED:
        case BOOKING_TIMELINE_EVENT.STARTED:
        case BOOKING_TIMELINE_EVENT.COMPLETED:
        case BOOKING_TIMELINE_EVENT.PAUSED:
        case BOOKING_TIMELINE_EVENT.RESUMED: {
          const copy = {
            [BOOKING_TIMELINE_EVENT.ASSIGNED]:
              "A technician has been assigned to your booking.",
            [BOOKING_TIMELINE_EVENT.ACCEPTED]:
              "Your booking was accepted by the technician.",
            [BOOKING_TIMELINE_EVENT.STARTED]:
              "Work has started on your booking.",
            [BOOKING_TIMELINE_EVENT.COMPLETED]:
              "Work on your booking has been completed.",
            [BOOKING_TIMELINE_EVENT.PAUSED]: "Work on your booking was paused.",
            [BOOKING_TIMELINE_EVENT.RESUMED]:
              "Work on your booking has resumed.",
          };
          return emailService.sendBookingUpdate({
            user: customer,
            booking,
            updateTitle: "Booking Update",
            updateMessage: copy[event],
          });
        }

        default:
          return null;
      }
    } catch (error) {
      logger.warn(`Booking email/SMS failed: ${error.message}`);
      return null;
    }
  }

  async invalidateBookingCache(bookingId) {
    await Promise.allSettled([
      cacheService.del(CACHE_KEYS.BOOKING_ANALYTICS),
      cacheService.del(`${CACHE_KEYS.BOOKING_DETAIL_PREFIX}${bookingId}`),
      cacheService.invalidatePrefix(CACHE_KEYS.BOOKING_LIST_PREFIX),
      cacheService.invalidatePrefix(CACHE_KEYS.TECH_JOBS_PREFIX),
      cacheService.invalidatePrefix(CACHE_KEYS.TECH_REPORT_PREFIX),
      cacheService.invalidatePrefix(CACHE_KEYS.TECH_DASHBOARD_PREFIX),
      invalidateAdminAnalytics(),
    ]);
  }

  async getTimeline(bookingId) {
    return await bookingTimelineRepository.findByBooking(bookingId);
  }

  async getHistory(bookingId) {
    const events =
      await bookingTimelineRepository.findHistoryByBooking(bookingId);

    return {
      bookingId,
      totalEvents: events.length,
      events,
    };
  }
}

export default new BookingEventService();
