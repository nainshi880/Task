import bookingRepository from "../repositories/booking.repository.js";
import paymentRepository from "../repositories/payment.repository.js";
import assignmentRepository from "../repositories/assignment.repository.js";
import auditRepository from "../repositories/audit.repository.js";
import bookingAnalyticsService from "./bookingAnalytics.service.js";
import assignmentService from "./assignment.service.js";
import bookingEventService from "./bookingEvent.service.js";
import paymentService from "./payment.service.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import BOOKING_STATUS from "../constants/bookingStatus.js";
import BOOKING_TIMELINE_EVENT from "../constants/bookingTimelineEvent.js";
import AUDIT_ACTION from "../constants/auditAction.js";
import PAYMENT_STATUS from "../constants/paymentStatus.js";

const ADMIN_CANCELLABLE_STATUSES = [
  BOOKING_STATUS.PENDING_PAYMENT,
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.PAUSED,
];

class AdminBookingService {
  async writeAudit({
    actorId,
    bookingId,
    action,
    description,
    metadata,
    ip,
    userAgent,
  }) {
    try {
      await auditRepository.create({
        actor: actorId,
        action,
        resource: "Booking",
        resourceId: bookingId,
        description,
        metadata,
        ipAddress: ip,
        userAgent,
      });
    } catch {
      // non-blocking
    }
  }

  async getBookingOrThrow(bookingId) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }
    return booking;
  }

  async listBookings(query) {
    return await bookingAnalyticsService.listBookings(query);
  }

  async searchBookings(query) {
    return await bookingAnalyticsService.searchBookings(query);
  }

  async filterBookings(query) {
    return await bookingAnalyticsService.filterBookings(query);
  }

  async getBookingDetails(bookingId) {
    const booking = await this.getBookingOrThrow(bookingId);

    const [payments, assignmentHistory, timeline] = await Promise.all([
      paymentRepository.findByBooking(bookingId),
      assignmentRepository.findByBooking(bookingId),
      bookingEventService.getTimeline(bookingId),
    ]);

    return {
      booking,
      payments,
      assignmentHistory,
      timeline,
    };
  }

  async getBookingTimeline(bookingId) {
    await this.getBookingOrThrow(bookingId);

    const [timeline, history] = await Promise.all([
      bookingEventService.getTimeline(bookingId),
      bookingEventService.getHistory(bookingId),
    ]);

    return { timeline, history };
  }

  async reassignTechnician(
    bookingId,
    adminId,
    { technicianId, reason },
    actor = {}
  ) {
    if (!technicianId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "technicianId is required."
      );
    }

    const result = await assignmentService.manualAssign(
      bookingId,
      technicianId,
      adminId,
      reason || "Reassigned by admin."
    );

    await this.writeAudit({
      actorId: adminId,
      bookingId,
      action: AUDIT_ACTION.ASSIGN,
      description: "Admin reassigned technician",
      metadata: { technicianId, reason },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      ...result,
      message: "Technician reassigned successfully.",
    };
  }

  async cancelBooking(bookingId, adminId, { reason } = {}, actor = {}) {
    const booking = await this.getBookingOrThrow(bookingId);

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Booking is already cancelled."
      );
    }

    if (booking.status === BOOKING_STATUS.CLOSED) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Closed bookings cannot be cancelled."
      );
    }

    if (!ADMIN_CANCELLABLE_STATUSES.includes(booking.status)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Booking in status "${booking.status}" cannot be cancelled by admin.`
      );
    }

    const cancelled = await bookingRepository.cancelBooking(bookingId, {
      status: BOOKING_STATUS.CANCELLED,
      cancelledBy: "Admin",
      cancellationReason: reason || "Cancelled by admin.",
    });

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.CANCELLED,
      actorId: adminId,
      actorRole: "admin",
      action: AUDIT_ACTION.CANCEL,
      fromStatus: booking.status,
      toStatus: BOOKING_STATUS.CANCELLED,
      note: reason || "Cancelled by admin.",
      metadata: { cancelledBy: "Admin" },
    });

    await this.writeAudit({
      actorId: adminId,
      bookingId,
      action: AUDIT_ACTION.CANCEL,
      description: "Admin cancelled booking",
      metadata: { reason },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      booking: cancelled,
      message: "Booking cancelled successfully.",
    };
  }

  async refundBooking(
    bookingId,
    adminUser,
    { amount, reason, method } = {},
    actor = {}
  ) {
    const booking = await this.getBookingOrThrow(bookingId);

    const payment = await paymentRepository.findLatestPaidByBooking(bookingId);

    if (!payment) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "No paid payment found for this booking."
      );
    }

    if (
      payment.status !== PAYMENT_STATUS.PAID &&
      payment.status !== PAYMENT_STATUS.REFUNDED
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Booking payment is not eligible for refund."
      );
    }

    const result = await paymentService.processRefund(
      adminUser,
      {
        paymentId: payment._id,
        amount,
        reason: reason || `Admin refund for booking ${bookingId}`,
        method,
      },
      {
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      }
    );

    await this.writeAudit({
      actorId: adminUser._id,
      bookingId,
      action: AUDIT_ACTION.REFUND,
      description: "Admin refunded booking payment",
      metadata: {
        paymentId: payment._id,
        refundAmount: result.refundAmount,
        method: result.method,
      },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      booking,
      payment: result.payment,
      refund: {
        refundAmount: result.refundAmount,
        totalRefunded: result.totalRefunded,
        fullyRefunded: result.fullyRefunded,
        method: result.method,
        razorpayRefundId: result.razorpayRefundId,
      },
      message: "Booking refund processed successfully.",
    };
  }

  async getReports(query = {}) {
    const [dashboard, periodReport] = await Promise.all([
      bookingAnalyticsService.getDashboardAnalytics(),
      bookingRepository.getReportSummary({
        fromDate: query.fromDate || query.startDate,
        toDate: query.toDate || query.endDate,
        status: query.status,
        serviceCategory: query.category || query.serviceCategory,
      }),
    ]);

    return {
      dashboard,
      periodReport,
    };
  }
}

export default new AdminBookingService();
