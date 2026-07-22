import bookingRepository from "../repositories/booking.repository.js";
import assignmentRepository from "../repositories/assignment.repository.js";
import technicianRepository from "../repositories/technician.repository.js";
import bookingEventService from "./bookingEvent.service.js";
import assignmentService from "./assignment.service.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import BOOKING_STATUS, {
  OPEN_FOR_CLAIM_STATUSES,
} from "../constants/bookingStatus.js";
import PAGINATION from "../constants/pagination.js";
import BOOKING_TIMELINE_EVENT from "../constants/bookingTimelineEvent.js";
import AUDIT_ACTION from "../constants/auditAction.js";
import withTransaction from "../utils/transaction.js";
import withRetry, { isTransientError } from "../utils/retry.js";
import fs from "fs/promises";
import cloudinary from "../config/cloudinary.js";
import logger from "../utils/logger.js";
import cacheService, { CACHE_KEYS } from "../utils/cache.js";

class BookingWorkflowService {
  async enrichBooking(booking) {
    if (!booking) return null;

    const customerId =
      booking.customer?._id || booking.customer;

    const address = await bookingRepository.findCustomerAddress(
      customerId,
      booking.address
    );

    const plain =
      typeof booking.toObject === "function"
        ? booking.toObject()
        : { ...booking };

    plain.addressDetails = address || null;
    return plain;
  }

  async uploadFilesToCloudinary(files = [], folder = "booking-completion-images") {
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

  assertAssignedTechnician(booking, technicianId) {
    const assignedId =
      booking.technician?._id?.toString() ||
      booking.technician?.toString();

    if (!assignedId || assignedId !== technicianId.toString()) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You are not assigned to this booking."
      );
    }
  }

  parsePagination(query = {}) {
    let page = parseInt(query.page, 10);
    let limit = parseInt(query.limit, 10);

    if (Number.isNaN(page) || page < 1) {
      page = PAGINATION.DEFAULT_PAGE;
    }

    if (Number.isNaN(limit) || limit < PAGINATION.MIN_LIMIT) {
      limit = PAGINATION.DEFAULT_LIMIT;
    }

    if (limit > PAGINATION.MAX_LIMIT) {
      limit = PAGINATION.MAX_LIMIT;
    }

    return { page, limit };
  }

  formatPaginatedResponse(items, page, limit, total) {
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // ======================================
  // Technician: My Jobs
  // ======================================

  async getTechnicianBookings(technicianId, query = {}) {
    const { page, limit } = this.parsePagination(query);

    const { bookings, total } =
      await bookingRepository.findByTechnician(technicianId, {
        status: query.status,
        page,
        limit,
      });

    const items = await Promise.all(
      bookings.map((booking) => this.enrichBooking(booking))
    );

    return this.formatPaginatedResponse(items, page, limit, total);
  }

  async getAssignedJobById(technicianId, bookingId) {
    let booking = await bookingRepository.findByIdAndTechnician(
      bookingId,
      technicianId
    );

    // Allow viewing open marketplace jobs the technician is eligible for
    if (!booking) {
      booking = await bookingRepository.findById(bookingId);
      if (
        !booking ||
        !OPEN_FOR_CLAIM_STATUSES.includes(booking.status) ||
        booking.technician
      ) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Job not found.");
      }

      await technicianRepository.ensureTechnicianReady(technicianId);

      const { addressDetails } = await assignmentService.getBookingContext(
        bookingId
      );
      const { candidates } = await assignmentService.getBroadcastCandidates(
        booking,
        addressDetails
      );
      const eligible = candidates.some(
        (c) => String(c.technician._id) === String(technicianId)
      );
      if (!eligible) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Job not found.");
      }
    }

    return this.enrichBooking(booking);
  }

  // ======================================
  // Accept Job
  // ======================================

  async acceptJob(technicianId, bookingId) {
    await technicianRepository.ensureTechnicianReady(technicianId);

    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    // Open marketplace: first technician to accept claims the Confirmed job
    if (
      OPEN_FOR_CLAIM_STATUSES.includes(booking.status) &&
      !booking.technician
    ) {
      const claimed = await assignmentService.claimOpenBooking(
        bookingId,
        technicianId
      );
      await cacheService.invalidatePrefix(CACHE_KEYS.TECH_JOBS_PREFIX);
      return this.enrichBooking(claimed.booking);
    }

    this.assertAssignedTechnician(booking, technicianId);

    if (booking.status !== BOOKING_STATUS.ASSIGNED) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only Assigned bookings can be accepted."
      );
    }

    const updated = await bookingRepository.updateById(bookingId, {
      status: BOOKING_STATUS.ACCEPTED,
    });

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.ACCEPTED,
      actorId: technicianId,
      actorRole: "technician",
      action: AUDIT_ACTION.ACCEPT,
      fromStatus: BOOKING_STATUS.ASSIGNED,
      toStatus: BOOKING_STATUS.ACCEPTED,
      note: "Technician accepted the job",
    });

    return this.enrichBooking(updated);
  }

  // ======================================
  // Technician Arriving
  // ======================================

  async markArriving(technicianId, bookingId) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    this.assertAssignedTechnician(booking, technicianId);

    if (booking.status !== BOOKING_STATUS.ACCEPTED) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only Accepted bookings can mark arriving."
      );
    }

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.ARRIVING,
      actorId: technicianId,
      actorRole: "technician",
      action: AUDIT_ACTION.UPDATE,
      fromStatus: BOOKING_STATUS.ACCEPTED,
      toStatus: BOOKING_STATUS.ACCEPTED,
      note: "Technician is arriving / on the way",
    });

    return this.enrichBooking(booking);
  }

  // ======================================
  // Reject Job → back to Pending for reassignment
  // ======================================

  async rejectJob(technicianId, bookingId, rejectionReason) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    this.assertAssignedTechnician(booking, technicianId);

    if (booking.status !== BOOKING_STATUS.ASSIGNED) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only Assigned bookings can be rejected."
      );
    }

    if (!rejectionReason?.trim()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Rejection reason is required."
      );
    }

    const previousTechnician = booking.technician;

    const updated = await withTransaction(async (session) => {
      const result = await bookingRepository.unassignTechnician(
        bookingId,
        {
          technician: null,
          status: BOOKING_STATUS.CONFIRMED,
          rejectionReason: rejectionReason.trim(),
          rejectedAt: new Date(),
        },
        session
      );

      await assignmentRepository.create(
        {
          booking: bookingId,
          technician: previousTechnician?._id || previousTechnician,
          assignedBy: null,
          method: "Manual",
          reason: `Rejected by technician: ${rejectionReason.trim()}`,
          matchScore: 0,
          matchDetails: {},
          previousTechnician:
            previousTechnician?._id || previousTechnician,
          status: "Failed",
        },
        session
      );

      return result;
    });

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.REJECTED,
      actorId: technicianId,
      actorRole: "technician",
      action: AUDIT_ACTION.REJECT,
      fromStatus: BOOKING_STATUS.ASSIGNED,
      toStatus: BOOKING_STATUS.CONFIRMED,
      note: rejectionReason.trim(),
    });

    // Re-offer to other eligible technicians
    try {
      await assignmentService.broadcastOpenBooking(bookingId);
      await cacheService.invalidatePrefix(CACHE_KEYS.TECH_JOBS_PREFIX);
    } catch (error) {
      logger.warn("Re-broadcast after reject failed", {
        bookingId: String(bookingId),
        message: error.message,
      });
    }

    return this.enrichBooking(updated);
  }

  // ======================================
  // Start Work
  // ======================================

  async startWork(technicianId, bookingId) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    this.assertAssignedTechnician(booking, technicianId);

    if (booking.status !== BOOKING_STATUS.ACCEPTED) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only Accepted bookings can be started."
      );
    }

    const updated = await bookingRepository.updateById(bookingId, {
      status: BOOKING_STATUS.IN_PROGRESS,
      startedAt: new Date(),
    });

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.STARTED,
      actorId: technicianId,
      actorRole: "technician",
      action: AUDIT_ACTION.START,
      fromStatus: BOOKING_STATUS.ACCEPTED,
      toStatus: BOOKING_STATUS.IN_PROGRESS,
      note: "Work started",
    });

    return this.enrichBooking(updated);
  }

  // ======================================
  // Upload Completion Images
  // ======================================

  async uploadCompletionImages(technicianId, bookingId, files = []) {
    if (!files.length) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Please upload at least one completion image."
      );
    }

    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    this.assertAssignedTechnician(booking, technicianId);

    if (
      ![
        BOOKING_STATUS.IN_PROGRESS,
        BOOKING_STATUS.PAUSED,
        BOOKING_STATUS.AWAITING_CONFIRMATION,
        BOOKING_STATUS.COMPLETED,
      ].includes(booking.status)
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Completion images can only be uploaded for In Progress, Paused, or Awaiting Confirmation bookings."
      );
    }

    const maxImages = 5;
    const remaining = maxImages - (booking.completionImages?.length || 0);

    if (remaining <= 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Maximum of ${maxImages} completion images allowed.`
      );
    }

    if (files.length > remaining) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `You can upload only ${remaining} more image(s).`
      );
    }

    const imageUrls = await this.uploadFilesToCloudinary(files);
    const updated = await bookingRepository.addCompletionImages(
      bookingId,
      imageUrls
    );

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.COMPLETION_IMAGES_UPLOADED,
      actorId: technicianId,
      actorRole: "technician",
      action: AUDIT_ACTION.UPDATE,
      fromStatus: booking.status,
      toStatus: booking.status,
      note: `${imageUrls.length} completion image(s) uploaded`,
      metadata: { count: imageUrls.length },
    });

    return this.enrichBooking(updated);
  }

  // ======================================
  // Complete Work
  // ======================================

  async completeWork(technicianId, bookingId, workNotes) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    this.assertAssignedTechnician(booking, technicianId);

    if (booking.status !== BOOKING_STATUS.IN_PROGRESS) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only In Progress bookings can be completed."
      );
    }

    if (!booking.completionImages?.length) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Upload at least one completion image before marking work as complete."
      );
    }

    const updateData = {
      status: BOOKING_STATUS.AWAITING_CONFIRMATION,
      completedAt: new Date(),
      customerConfirmed: false,
      customerConfirmedAt: null,
    };

    if (workNotes !== undefined) {
      updateData.workNotes = workNotes;
    }

    let updated = await bookingRepository.updateById(
      bookingId,
      updateData
    );

    if (workNotes?.trim()) {
      updated = await bookingRepository.addWorkNote(
        bookingId,
        workNotes.trim()
      );
    }

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.AWAITING_CONFIRMATION,
      actorId: technicianId,
      actorRole: "technician",
      action: AUDIT_ACTION.COMPLETE,
      fromStatus: BOOKING_STATUS.IN_PROGRESS,
      toStatus: BOOKING_STATUS.AWAITING_CONFIRMATION,
      note: workNotes || "Work finished — awaiting customer confirmation",
    });

    return this.enrichBooking(updated);
  }

  // ======================================
  // Pause Work
  // ======================================

  async pauseWork(technicianId, bookingId, reason) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    this.assertAssignedTechnician(booking, technicianId);

    if (booking.status !== BOOKING_STATUS.IN_PROGRESS) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only In Progress bookings can be paused."
      );
    }

    const updated = await bookingRepository.updateById(bookingId, {
      status: BOOKING_STATUS.PAUSED,
      pausedAt: new Date(),
    });

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.PAUSED,
      actorId: technicianId,
      actorRole: "technician",
      action: AUDIT_ACTION.UPDATE,
      fromStatus: BOOKING_STATUS.IN_PROGRESS,
      toStatus: BOOKING_STATUS.PAUSED,
      note: reason || "Work paused",
    });

    return this.enrichBooking(updated);
  }

  // ======================================
  // Resume Work
  // ======================================

  async resumeWork(technicianId, bookingId) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    this.assertAssignedTechnician(booking, technicianId);

    if (booking.status !== BOOKING_STATUS.PAUSED) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only Paused bookings can be resumed."
      );
    }

    const updated = await bookingRepository.updateById(bookingId, {
      status: BOOKING_STATUS.IN_PROGRESS,
      resumedAt: new Date(),
    });

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.RESUMED,
      actorId: technicianId,
      actorRole: "technician",
      action: AUDIT_ACTION.UPDATE,
      fromStatus: BOOKING_STATUS.PAUSED,
      toStatus: BOOKING_STATUS.IN_PROGRESS,
      note: "Work resumed",
    });

    return this.enrichBooking(updated);
  }

  // ======================================
  // Add Work Notes
  // ======================================

  async addWorkNotes(technicianId, bookingId, note) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    this.assertAssignedTechnician(booking, technicianId);

    if (
      ![
        BOOKING_STATUS.ACCEPTED,
        BOOKING_STATUS.IN_PROGRESS,
        BOOKING_STATUS.PAUSED,
      ].includes(booking.status)
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Work notes can only be added while job is Accepted, In Progress, or Paused."
      );
    }

    if (!note?.trim()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Work note is required."
      );
    }

    const updated = await bookingRepository.addWorkNote(
      bookingId,
      note.trim()
    );

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.WORK_NOTE_ADDED,
      actorId: technicianId,
      actorRole: "technician",
      action: AUDIT_ACTION.UPDATE,
      fromStatus: booking.status,
      toStatus: booking.status,
      note: note.trim(),
    });

    return this.enrichBooking(updated);
  }

  // ======================================
  // Customer Confirms Completion
  // ======================================

  async confirmCompletion(customerId, bookingId) {
    const booking = await bookingRepository.findByIdAndCustomer(
      bookingId,
      customerId
    );

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    if (booking.status !== BOOKING_STATUS.AWAITING_CONFIRMATION) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only bookings awaiting confirmation can be confirmed."
      );
    }

    if (booking.customerConfirmed) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Completion already confirmed."
      );
    }

    const updated = await bookingRepository.updateById(bookingId, {
      status: BOOKING_STATUS.COMPLETED,
      customerConfirmed: true,
      customerConfirmedAt: new Date(),
    });

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.CUSTOMER_CONFIRMED,
      actorId: customerId,
      actorRole: "customer",
      action: AUDIT_ACTION.CONFIRM,
      fromStatus: BOOKING_STATUS.AWAITING_CONFIRMATION,
      toStatus: BOOKING_STATUS.COMPLETED,
      note: "Customer confirmed completion",
    });

    return this.enrichBooking(updated);
  }

  // ======================================
  // Close Booking
  // ======================================

  async closeBooking(customerId, bookingId) {
    const booking = await bookingRepository.findByIdAndCustomer(
      bookingId,
      customerId
    );

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    if (booking.status !== BOOKING_STATUS.COMPLETED) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only Completed bookings can be closed."
      );
    }

    if (!booking.customerConfirmed) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Confirm completion before closing the booking."
      );
    }

    const updated = await bookingRepository.updateById(bookingId, {
      status: BOOKING_STATUS.CLOSED,
      closedAt: new Date(),
    });

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.CLOSED,
      actorId: customerId,
      actorRole: "customer",
      action: AUDIT_ACTION.CLOSE,
      fromStatus: BOOKING_STATUS.COMPLETED,
      toStatus: BOOKING_STATUS.CLOSED,
      note: "Booking closed",
    });

    return this.enrichBooking(updated);
  }
}

export default new BookingWorkflowService();
