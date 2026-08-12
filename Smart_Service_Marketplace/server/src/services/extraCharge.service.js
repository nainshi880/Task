import fs from "fs/promises";
import extraChargeRepository from "../repositories/extraCharge.repository.js";
import bookingRepository from "../repositories/booking.repository.js";
import bookingEventService from "./bookingEvent.service.js";
import notificationService from "./notification.service.js";
import {
  queuePushNotification,
  queueSocketEmit,
} from "./notificationQueue.service.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import BOOKING_STATUS from "../constants/bookingStatus.js";
import BOOKING_TIMELINE_EVENT from "../constants/bookingTimelineEvent.js";
import BOOKING_SOCKET_EVENTS from "../constants/bookingSocketEvents.js";
import EXTRA_CHARGE_STATUS from "../constants/extraChargeStatus.js";
import AUDIT_ACTION from "../constants/auditAction.js";
import { isAdminRole } from "../constants/roles.js";
import withRetry, { isTransientError } from "../utils/retry.js";
import cloudinary from "../config/cloudinary.js";
import logger from "../utils/logger.js";

const ALLOWED_CREATE_STATUSES = [
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.PAUSED,
];

class ExtraChargeService {
  async uploadFilesToCloudinary(files = [], folder = "booking-extra-charge-images") {
    if (!files.length) return [];

    const urls = [];

    for (const file of files) {
      try {
        const result = await withRetry(
          async () =>
            cloudinary.uploader.upload(file.path, {
              folder,
            }),
          {
            retries: 3,
            delayMs: 400,
            shouldRetry: isTransientError,
          }
        );
        urls.push(result.secure_url);
      } finally {
        try {
          await fs.unlink(file.path);
        } catch {
          // ignore temp cleanup errors
        }
      }
    }

    return urls;
  }

  async assertTechnicianOwnsBooking(technicianId, bookingId) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    const assignedId =
      booking.technician?._id?.toString() ||
      booking.technician?.toString();

    if (!assignedId || assignedId !== technicianId.toString()) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You are not assigned to this booking."
      );
    }

    return booking;
  }

  async assertCustomerOwnsExtraCharge(customerId, extraChargeId) {
    const extraCharge = await extraChargeRepository.findById(extraChargeId);
    if (!extraCharge) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Extra charge not found.");
    }

    const ownerId =
      extraCharge.customer?._id?.toString() ||
      extraCharge.customer?.toString();

    if (!ownerId || ownerId !== customerId.toString()) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You cannot manage this extra charge."
      );
    }

    return extraCharge;
  }

  async notifyCustomerExtraCharge(extraCharge, booking) {
    const customerId =
      extraCharge.customer?._id || extraCharge.customer;
    const bookingId = booking._id || extraCharge.booking;
    const amount = Number(extraCharge.amount);
    const actionUrl = `/bookings/${bookingId}`;

    const title = "Extra charge requested";
    const message = `Your technician found additional issues for ${booking.serviceName}. Extra amount: ₹${amount}. Please review and accept or reject.`;

    try {
      await notificationService.notifyBooking(customerId, {
        title,
        message,
        bookingId,
        actionUrl,
        metadata: {
          event: "EXTRA_CHARGE_REQUESTED",
          extraChargeId: String(extraCharge._id),
          amount,
        },
      });
    } catch (error) {
      logger.warn(`Extra charge in-app notify failed: ${error.message}`);
    }

    await queueSocketEmit({
      userId: customerId,
      event: BOOKING_SOCKET_EVENTS.EXTRA_CHARGE,
      payload: {
        type: "extra_charge.pending",
        bookingId: String(bookingId),
        extraChargeId: String(extraCharge._id),
        amount,
        description: extraCharge.description,
        images: extraCharge.images || [],
        status: EXTRA_CHARGE_STATUS.PENDING,
      },
    });

    await queuePushNotification({
      userId: customerId,
      title,
      body: message,
      data: {
        type: "extra_charge.pending",
        bookingId: String(bookingId),
        extraChargeId: String(extraCharge._id),
        amount: String(amount),
        actionUrl,
        link: actionUrl,
      },
    });
  }

  async notifyTechnicianDecision(extraCharge, booking, decision) {
    const technicianId =
      extraCharge.technician?._id || extraCharge.technician;
    const bookingId = booking._id || extraCharge.booking;
    const actionUrl = `/technician/jobs/${bookingId}`;

    const isPaid = decision === "paid";
    const isRejected = decision === "rejected";

    const title = isPaid
      ? "Extra charge paid"
      : isRejected
        ? "Extra charge rejected"
        : "Extra charge accepted";

    const message = isPaid
      ? `Customer paid ₹${extraCharge.amount} extra for ${booking.serviceName}. Complete the full expanded scope.`
      : isRejected
        ? `Customer rejected the extra charge for ${booking.serviceName}. Complete the original booked scope only.`
        : `Customer accepted the extra charge of ₹${extraCharge.amount}. Awaiting payment.`;

    try {
      await notificationService.notifyBooking(technicianId, {
        title,
        message,
        bookingId,
        actionUrl,
        metadata: {
          event: isPaid
            ? "EXTRA_CHARGE_PAID"
            : isRejected
              ? "EXTRA_CHARGE_REJECTED"
              : "EXTRA_CHARGE_APPROVED",
          extraChargeId: String(extraCharge._id),
          amount: extraCharge.amount,
        },
      });
    } catch (error) {
      logger.warn(`Extra charge tech notify failed: ${error.message}`);
    }

    await queueSocketEmit({
      userId: technicianId,
      event: BOOKING_SOCKET_EVENTS.EXTRA_CHARGE,
      payload: {
        type: isPaid
          ? "extra_charge.paid"
          : isRejected
            ? "extra_charge.rejected"
            : "extra_charge.approved",
        bookingId: String(bookingId),
        extraChargeId: String(extraCharge._id),
        amount: Number(extraCharge.amount),
        status: extraCharge.status,
      },
    });

    await queuePushNotification({
      userId: technicianId,
      title,
      body: message,
      data: {
        type: isPaid
          ? "extra_charge.paid"
          : isRejected
            ? "extra_charge.rejected"
            : "extra_charge.approved",
        bookingId: String(bookingId),
        extraChargeId: String(extraCharge._id),
        actionUrl,
        link: actionUrl,
      },
    });
  }

  /**
   * Technician uploads evidence + amount while on site (In Progress / Paused).
   */
  async createExtraCharge(technicianId, bookingId, { description, amount }, files = []) {
    const booking = await this.assertTechnicianOwnsBooking(
      technicianId,
      bookingId
    );

    if (!ALLOWED_CREATE_STATUSES.includes(booking.status)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Extra charges can only be requested while work is In Progress or Paused."
      );
    }

    if (booking.paymentStatus !== "Paid") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Booking must be paid before requesting an extra charge."
      );
    }

    const blocking = await extraChargeRepository.findBlockingByBooking(
      bookingId
    );
    if (blocking) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "An extra charge is already awaiting customer response or payment for this booking."
      );
    }

    if (!files?.length) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Upload at least one photo of the additional issue."
      );
    }

    const imageUrls = await this.uploadFilesToCloudinary(files);

    if (!imageUrls.length) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Failed to upload issue photos. Please try again."
      );
    }

    const customerId = booking.customer?._id || booking.customer;
    const orderAmount = Number(amount);

    let extraCharge;
    try {
      extraCharge = await extraChargeRepository.create({
        booking: bookingId,
        technician: technicianId,
        customer: customerId,
        description: description.trim(),
        amount: orderAmount,
        images: imageUrls,
        status: EXTRA_CHARGE_STATUS.PENDING,
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          "An extra charge is already awaiting customer response or payment for this booking."
        );
      }
      throw error;
    }

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.EXTRA_CHARGE_REQUESTED,
      actorId: technicianId,
      actorRole: "technician",
      action: AUDIT_ACTION.UPDATE,
      fromStatus: booking.status,
      toStatus: booking.status,
      note: `Extra charge ₹${orderAmount} requested — ${description.trim().slice(0, 120)}`,
      metadata: {
        extraChargeId: String(extraCharge._id),
        amount: orderAmount,
        imageCount: imageUrls.length,
      },
    });

    await this.notifyCustomerExtraCharge(extraCharge, booking);

    return extraCharge;
  }

  async listByBooking(userId, bookingId, role) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    const customerId =
      booking.customer?._id?.toString() || booking.customer?.toString();
    const technicianId =
      booking.technician?._id?.toString() ||
      booking.technician?.toString();

    const isCustomer = customerId === userId.toString();
    const isTechnician = technicianId === userId.toString();

    if (!isCustomer && !isTechnician && !isAdminRole(role)) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Access denied.");
    }

    return extraChargeRepository.findByBooking(bookingId);
  }

  async acceptExtraCharge(customerId, extraChargeId) {
    const extraCharge = await this.assertCustomerOwnsExtraCharge(
      customerId,
      extraChargeId
    );

    if (extraCharge.status === EXTRA_CHARGE_STATUS.APPROVED) {
      return extraCharge;
    }

    if (extraCharge.status === EXTRA_CHARGE_STATUS.PAID) {
      return extraCharge;
    }

    if (extraCharge.status !== EXTRA_CHARGE_STATUS.PENDING) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Cannot accept an extra charge with status ${extraCharge.status}.`
      );
    }

    const updated = await extraChargeRepository.markApproved(extraChargeId);
    const bookingId = extraCharge.booking?._id || extraCharge.booking;
    const booking = await bookingRepository.findById(bookingId);

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.EXTRA_CHARGE_APPROVED,
      actorId: customerId,
      actorRole: "customer",
      action: AUDIT_ACTION.UPDATE,
      fromStatus: booking?.status,
      toStatus: booking?.status,
      note: `Customer accepted extra charge of ₹${extraCharge.amount}`,
      metadata: {
        extraChargeId: String(extraChargeId),
        amount: extraCharge.amount,
      },
    });

    if (booking) {
      await this.notifyTechnicianDecision(updated, booking, "approved");
    }

    return updated;
  }

  async rejectExtraCharge(customerId, extraChargeId, rejectionReason = "") {
    const extraCharge = await this.assertCustomerOwnsExtraCharge(
      customerId,
      extraChargeId
    );

    if (
      extraCharge.status !== EXTRA_CHARGE_STATUS.PENDING &&
      extraCharge.status !== EXTRA_CHARGE_STATUS.APPROVED
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Cannot reject an extra charge with status ${extraCharge.status}.`
      );
    }

    const updated = await extraChargeRepository.markRejected(
      extraChargeId,
      rejectionReason
    );

    const bookingId = extraCharge.booking?._id || extraCharge.booking;
    const booking = await bookingRepository.findById(bookingId);

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.EXTRA_CHARGE_REJECTED,
      actorId: customerId,
      actorRole: "customer",
      action: AUDIT_ACTION.UPDATE,
      fromStatus: booking?.status,
      toStatus: booking?.status,
      note: rejectionReason
        ? `Customer rejected extra charge: ${rejectionReason}`
        : "Customer rejected extra charge — original scope only",
      metadata: {
        extraChargeId: String(extraChargeId),
        amount: extraCharge.amount,
        rejectionReason: rejectionReason || "",
      },
    });

    if (booking) {
      await this.notifyTechnicianDecision(updated, booking, "rejected");
    }

    return updated;
  }

  /**
   * Called after Razorpay verify / webhook for purpose=extra_charge.
   * Marks charge PAID, expands booking amount/scope, notifies technician.
   */
  async finalizePaidExtraCharge(extraChargeId, paymentId, session = null) {
    const extraCharge = await extraChargeRepository.findById(extraChargeId);
    if (!extraCharge) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Extra charge not found.");
    }

    if (extraCharge.status === EXTRA_CHARGE_STATUS.PAID) {
      return { alreadyPaid: true, extraCharge };
    }

    if (
      extraCharge.status !== EXTRA_CHARGE_STATUS.PENDING &&
      extraCharge.status !== EXTRA_CHARGE_STATUS.APPROVED
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Cannot pay an extra charge with status ${extraCharge.status}.`
      );
    }

    const updated = await extraChargeRepository.markPaid(
      extraChargeId,
      { paymentId },
      session
    );

    const bookingId = extraCharge.booking?._id || extraCharge.booking;
    const booking = await bookingRepository.findById(bookingId);

    if (booking) {
      const baseAmount =
        booking.originalAmount != null
          ? Number(booking.originalAmount)
          : Number(booking.amount) - Number(booking.extraChargeTotal || 0);

      const nextExtraTotal =
        Number(booking.extraChargeTotal || 0) + Number(extraCharge.amount);
      const nextAmount = Number(baseAmount) + nextExtraTotal;

      await bookingRepository.updateById(
        bookingId,
        {
          originalAmount:
            booking.originalAmount != null
              ? booking.originalAmount
              : Number(booking.amount) - Number(booking.extraChargeTotal || 0),
          amount: nextAmount,
          extraChargeTotal: nextExtraTotal,
          scopeExpanded: true,
        },
        session
      );
    }

    return { alreadyPaid: false, extraCharge: updated, booking };
  }

  async afterExtraChargePaid(extraChargeId) {
    const extraCharge = await extraChargeRepository.findById(extraChargeId);
    if (!extraCharge) return;

    const bookingId = extraCharge.booking?._id || extraCharge.booking;
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) return;

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.EXTRA_CHARGE_PAID,
      actorId: extraCharge.customer?._id || extraCharge.customer,
      actorRole: "customer",
      action: AUDIT_ACTION.PAY,
      fromStatus: booking.status,
      toStatus: booking.status,
      note: `Extra charge of ₹${extraCharge.amount} paid — full scope unlocked`,
      metadata: {
        extraChargeId: String(extraChargeId),
        amount: extraCharge.amount,
      },
    });

    await this.notifyTechnicianDecision(extraCharge, booking, "paid");
  }

  async assertNoBlockingExtraCharge(bookingId) {
    const blocking = await extraChargeRepository.findBlockingByBooking(
      bookingId
    );
    if (blocking) {
      const waiting =
        blocking.status === EXTRA_CHARGE_STATUS.PENDING
          ? "customer response"
          : "customer payment";
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Cannot complete the job while an extra charge is awaiting ${waiting}.`
      );
    }
  }
}

export default new ExtraChargeService();
