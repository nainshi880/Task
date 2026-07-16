import auditRepository from "../repositories/audit.repository.js";
import bookingTimelineRepository from "../repositories/bookingTimeline.repository.js";
import cacheService, { CACHE_KEYS } from "../utils/cache.js";

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
  }

  async invalidateBookingCache(bookingId) {
    await Promise.allSettled([
      cacheService.del(CACHE_KEYS.BOOKING_ANALYTICS),
      cacheService.del(`${CACHE_KEYS.BOOKING_DETAIL_PREFIX}${bookingId}`),
      cacheService.invalidatePrefix(CACHE_KEYS.BOOKING_LIST_PREFIX),
      cacheService.invalidatePrefix(CACHE_KEYS.TECH_JOBS_PREFIX),
      cacheService.invalidatePrefix(CACHE_KEYS.TECH_REPORT_PREFIX),
      cacheService.invalidatePrefix(CACHE_KEYS.TECH_DASHBOARD_PREFIX),
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
