import bookingRepository from "../repositories/booking.repository.js";
import technicianRepository from "../repositories/technician.repository.js";
import adminRepository from "../repositories/admin.repository.js";
import notificationService from "./notification.service.js";
import assignmentRepository from "../repositories/assignment.repository.js";
import bookingEventService from "./bookingEvent.service.js";
import chatService from "./chat.service.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import logger from "../utils/logger.js";
import {
  parsePagination,
  formatPaginatedResponse,
} from "../utils/pagination.js";
import BOOKING_STATUS, {
  OPEN_FOR_CLAIM_STATUSES,
} from "../constants/bookingStatus.js";
import ASSIGNMENT_METHOD, {
  ASSIGNMENT_PRIORITY_WEIGHTS,
} from "../constants/assignment.js";
import PAGINATION from "../constants/pagination.js";
import BOOKING_TIMELINE_EVENT from "../constants/bookingTimelineEvent.js";
import BOOKING_SOCKET_EVENTS from "../constants/bookingSocketEvents.js";
import AUDIT_ACTION from "../constants/auditAction.js";
import NOTIFICATION_TYPES from "../constants/notificationType.js";
import withTransaction from "../utils/transaction.js";
import cacheService, { CACHE_KEYS } from "../utils/cache.js";
import { isUserOnline } from "../sockets/presence.js";
import { getIO } from "../sockets/io.js";
import pushService from "./push.service.js";

class AssignmentService {
  getBookingCity(addressDetails, customer) {
    return (
      addressDetails?.city ||
      customer?.city ||
      ""
    ).trim();
  }

  calculatePriorityScore(technician, { city, skill, workload }) {
    const maxWorkload = technician.maxWorkload || 5;
    const rating = technician.rating ?? 5;

    const cityMatch =
      city &&
      technician.city &&
      technician.city.toLowerCase() === city.toLowerCase();

    const skillMatch =
      skill &&
      Array.isArray(technician.skills) &&
      technician.skills.some(
        (s) => s.toLowerCase() === skill.toLowerCase()
      );

    const isAvailable = technician.availability === true;
    const hasCapacity = workload < maxWorkload;

    const cityScore = cityMatch ? ASSIGNMENT_PRIORITY_WEIGHTS.CITY : 0;
    const skillScore = skillMatch ? ASSIGNMENT_PRIORITY_WEIGHTS.SKILL : 0;
    const availabilityScore = isAvailable
      ? ASSIGNMENT_PRIORITY_WEIGHTS.AVAILABILITY
      : 0;

    const workloadRatio = hasCapacity
      ? (maxWorkload - workload) / maxWorkload
      : 0;
    const workloadScore =
      workloadRatio * ASSIGNMENT_PRIORITY_WEIGHTS.WORKLOAD;

    const ratingScore =
      (rating / 5) * ASSIGNMENT_PRIORITY_WEIGHTS.RATING;

    const priorityScore =
      cityScore +
      skillScore +
      availabilityScore +
      workloadScore +
      ratingScore;

    return {
      priorityScore: Number(priorityScore.toFixed(2)),
      cityMatch: Boolean(cityMatch),
      skillMatch: Boolean(skillMatch),
      availability: isAvailable,
      workload,
      maxWorkload,
      rating,
      hasCapacity,
    };
  }

  async rankTechnicians(booking, addressDetails) {
    const city = this.getBookingCity(
      addressDetails,
      booking.customer
    );
    const skill = booking.serviceCategory;

    // Prefer city+skill match; fall back to broader pools
    let candidates = await technicianRepository.findEligibleTechnicians({
      city,
      skill,
    });

    if (!candidates.length) {
      candidates = await technicianRepository.findEligibleTechnicians({
        city,
      });
    }

    if (!candidates.length) {
      candidates = await technicianRepository.findEligibleTechnicians({
        skill,
      });
    }

    if (!candidates.length) {
      candidates = await technicianRepository.findEligibleTechnicians();
    }

    const technicianIds = candidates.map((t) => t._id);
    const workloads =
      await technicianRepository.getWorkloads(technicianIds);

    const ranked = candidates
      .map((technician) => {
        const workload =
          workloads[technician._id.toString()] || 0;
        const matchDetails = this.calculatePriorityScore(technician, {
          city,
          skill,
          workload,
        });

        return {
          technician,
          workload,
          matchDetails,
          priorityScore: matchDetails.priorityScore,
        };
      })
      .filter((item) => item.matchDetails.hasCapacity)
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) {
          return b.priorityScore - a.priorityScore;
        }
        if (a.workload !== b.workload) {
          return a.workload - b.workload;
        }
        return (b.technician.rating || 0) - (a.technician.rating || 0);
      });

    return {
      city,
      skill,
      ranked,
    };
  }

  async assertAssignable(booking) {
    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Cannot assign technician to a cancelled booking."
      );
    }

    if (
      ![
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.PENDING,
        BOOKING_STATUS.ASSIGNED,
      ].includes(booking.status)
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Technician can only be assigned when booking is Confirmed, Pending, or Assigned."
      );
    }
  }

  getSocketIo() {
    return getIO();
  }

  /**
   * Collect FCM registration tokens from the technician user document.
   */
  extractDeviceTokens(technician = {}) {
    const tokens = [];

    const addToken = (value) => {
      if (typeof value === "string") {
        const normalized = value.trim();
        if (normalized) tokens.push(normalized);
      }
    };

    addToken(technician.deviceToken);
    if (Array.isArray(technician.deviceTokens)) {
      technician.deviceTokens.forEach(addToken);
    }

    return [...new Set(tokens)];
  }

  /**
   * Emit realtime assignment event to the technician's user room when online.
   */
  async emitAssignmentSocketEvent(technicianId, payload) {
    if (!technicianId) return false;

    const io = this.getSocketIo();
    if (!io) return false;

    if (!isUserOnline(technicianId)) {
      logger.debug("Technician offline — skip booking:assigned socket", {
        technicianId: String(technicianId),
      });
      return false;
    }

    io.to(`user:${technicianId}`).emit(
      BOOKING_SOCKET_EVENTS.ASSIGNED,
      payload
    );
    return true;
  }

  /**
   * Send FCM push via Firebase Admin when the technician has a device token.
   */
  async sendAssignmentPushNotification(technician, payload) {
    const technicianId = technician?._id || technician?.id;
    if (!technicianId) return null;

    return pushService.sendToUser(technicianId, {
      title: payload.title,
      body: payload.message,
      data: payload.data || {},
    });
  }

  /**
   * Centralized post-assignment actions (chat → in-app → socket → FCM).
   */
  async handleAssignmentFollowUps({
    booking,
    bookingId,
    technicianId,
    assignmentMethod,
    assignmentRecord,
    metadata = {},
    bookingUpdated,
  }) {
    await this.ensureChatRoom(bookingId);

    const technicianRecord =
      await technicianRepository.findById(technicianId);
    const serviceLabel =
      booking.serviceName || booking.serviceCategory || "service";
    const isReassign = Boolean(metadata.previousTechnician);

    const notificationPayload = {
      title: isReassign ? "Job reassigned to you" : "New Service Assigned",
      message: isReassign
        ? `You have been reassigned to a ${serviceLabel} booking.`
        : `A customer has booked a ${serviceLabel} service.`,
      bookingId: bookingUpdated?._id || bookingId,
      actionUrl: `/technician/jobs/${bookingId}`,
      metadata: {
        serviceCategory: booking.serviceCategory,
        serviceName: booking.serviceName,
        customerId: booking.customer?._id || booking.customer,
        assignmentMethod,
        assignmentId: assignmentRecord?._id,
        ...metadata,
      },
    };

    await notificationService.notifyBooking(technicianId, notificationPayload);

    const socketPayload = {
      bookingId: String(bookingUpdated?._id || bookingId),
      status: BOOKING_STATUS.ASSIGNED,
      assignmentMethod,
      assignmentId: assignmentRecord?._id
        ? String(assignmentRecord._id)
        : undefined,
      serviceCategory: booking.serviceCategory,
      serviceName: booking.serviceName,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      isReassign,
    };

    await this.emitAssignmentSocketEvent(technicianId, socketPayload);
    await this.sendAssignmentPushNotification(technicianRecord, {
      title: notificationPayload.title,
      message: notificationPayload.message,
      data: {
        type: BOOKING_SOCKET_EVENTS.ASSIGNED,
        bookingId: String(bookingUpdated?._id || bookingId),
        technicianId: String(technicianId),
        assignmentMethod,
        actionUrl: notificationPayload.actionUrl || `/technician/jobs/${bookingId}`,
        link: notificationPayload.actionUrl || `/technician/jobs/${bookingId}`,
      },
    });
  }

  async getBookingContext(bookingId) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    const customerId =
      booking.customer?._id || booking.customer;

    const addressDetails =
      await bookingRepository.findCustomerAddress(
        customerId,
        booking.address
      );

    return { booking, addressDetails, customerId };
  }

  async emitToUser(technicianId, event, payload) {
    if (!technicianId) return false;
    const io = this.getSocketIo();
    if (!io) return false;
    if (!isUserOnline(technicianId)) return false;
    io.to(`user:${technicianId}`).emit(event, payload);
    return true;
  }

  /**
   * Eligible technicians for an open booking (skill-first, then city, then all).
   */
  async getBroadcastCandidates(booking, addressDetails) {
    const { ranked, city, skill } = await this.rankTechnicians(
      booking,
      addressDetails
    );

    const skillMatched = ranked.filter((r) => r.matchDetails.skillMatch);
    const cityMatched = ranked.filter((r) => r.matchDetails.cityMatch);
    const candidates = skillMatched.length
      ? skillMatched
      : cityMatched.length
        ? cityMatched
        : ranked;

    return { candidates, city, skill };
  }

  async notifyTechnicianJobOffer(technicianId, booking, bookingId) {
    const serviceLabel =
      booking.serviceName || booking.serviceCategory || "service";
    const title = "New job available";
    const message = `A ${serviceLabel} booking is open — accept it before another technician claims it.`;
    const actionUrl = `/technician/jobs/${bookingId}`;
    const payload = {
      bookingId: String(bookingId),
      status: booking.status || BOOKING_STATUS.CONFIRMED,
      serviceCategory: booking.serviceCategory,
      serviceName: booking.serviceName,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingTime,
      actionUrl,
    };

    await notificationService.notifyBooking(technicianId, {
      title,
      message,
      bookingId,
      actionUrl,
      metadata: {
        offer: true,
        serviceCategory: booking.serviceCategory,
        serviceName: booking.serviceName,
      },
    });

    await this.emitToUser(
      technicianId,
      BOOKING_SOCKET_EVENTS.AVAILABLE,
      payload
    );

    await this.sendAssignmentPushNotification(
      { _id: technicianId },
      {
        title,
        message,
        data: {
          type: BOOKING_SOCKET_EVENTS.AVAILABLE,
          bookingId: String(bookingId),
          actionUrl,
          link: actionUrl,
        },
      }
    );
  }

  async notifyAdminsOfAssignment(booking, bookingId, technician) {
    const admins = await adminRepository.listAdmins();
    const serviceLabel =
      booking.serviceName || booking.serviceCategory || "service";
    const techName = technician?.name || "A technician";

    await Promise.all(
      (admins || []).map((admin) =>
        notificationService.notify({
          userId: admin._id,
          title: "Booking claimed",
          message: `${techName} accepted a ${serviceLabel} booking.`,
          type: NOTIFICATION_TYPES.BOOKING,
          bookingId,
          actionUrl: `/admin/bookings/${bookingId}`,
          metadata: {
            technicianId: technician?._id,
            technicianName: techName,
          },
        })
      )
    );
  }

  async withdrawOfferFromOthers(technicianIds, bookingId, claimedBy) {
    const payload = {
      bookingId: String(bookingId),
      claimedBy: String(claimedBy),
      status: BOOKING_STATUS.ASSIGNED,
    };

    await Promise.all(
      technicianIds.map(async (id) => {
        const technicianId = id?._id || id;
        if (String(technicianId) === String(claimedBy)) return;

        await notificationService.notifyBooking(technicianId, {
          title: "Job no longer available",
          message: "Another technician accepted this booking first.",
          bookingId,
          actionUrl: "/technician/jobs",
          metadata: { withdrawn: true, claimedBy: String(claimedBy) },
        });

        await this.emitToUser(
          technicianId,
          BOOKING_SOCKET_EVENTS.CLAIMED,
          payload
        );
      })
    );
  }

  /**
   * Paid booking → Confirmed, then preferred assign or broadcast to eligible techs.
   * Idempotent: second call (webhook after verify) does not re-notify.
   */
  async activateBookingAfterPayment(bookingId) {
    const { booking } = await this.getBookingContext(bookingId);

    if (booking.technician) {
      return { booking, activated: false, reason: "already_assigned" };
    }

    if (booking.status === BOOKING_STATUS.CONFIRMED) {
      return { booking, activated: false, reason: "already_confirmed" };
    }

    if (
      booking.status !== BOOKING_STATUS.PENDING_PAYMENT &&
      booking.status !== BOOKING_STATUS.PENDING
    ) {
      logger.info("Skip post-payment activation — booking already in progress", {
        bookingId: String(bookingId),
        status: booking.status,
      });
      return { booking, activated: false };
    }

    const fromStatus = booking.status;
    const confirmed = await bookingRepository.updateById(bookingId, {
      status: BOOKING_STATUS.CONFIRMED,
    });

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.PAYMENT_CONFIRMED,
      actorId: booking.customer?._id || booking.customer,
      actorRole: "customer",
      action: AUDIT_ACTION.PAY,
      fromStatus,
      toStatus: BOOKING_STATUS.CONFIRMED,
      note: "Payment successful — booking confirmed",
    });

    const preferredId =
      confirmed.preferredTechnician?._id || confirmed.preferredTechnician;

    if (preferredId) {
      try {
        const result = await this.finalizePreferredAssignment(
          bookingId,
          preferredId,
          booking.customer?._id || booking.customer
        );
        await cacheService.invalidatePrefix(CACHE_KEYS.TECH_JOBS_PREFIX);
        return {
          booking: result.booking || confirmed,
          activated: true,
          mode: "preferred",
        };
      } catch (error) {
        logger.warn("Preferred assign after payment failed — broadcasting", {
          bookingId: String(bookingId),
          message: error.message,
        });
      }
    }

    try {
      const result = await this.broadcastOpenBooking(bookingId);
      await cacheService.invalidatePrefix(CACHE_KEYS.TECH_JOBS_PREFIX);
      return {
        booking: result.booking || confirmed,
        activated: true,
        mode: "broadcast",
        notified: result.notified,
      };
    } catch (error) {
      logger.warn("Broadcast after payment failed", {
        bookingId: String(bookingId),
        message: error.message,
      });
      return { booking: confirmed, activated: true, mode: "confirmed_only" };
    }
  }

  /**
   * Paid + Confirmed booking — notify all eligible techs. First to accept wins.
   */
  async broadcastOpenBooking(bookingId) {
    const { booking, addressDetails } =
      await this.getBookingContext(bookingId);

    if (!OPEN_FOR_CLAIM_STATUSES.includes(booking.status)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only confirmed (paid) bookings can be offered to technicians."
      );
    }

    if (booking.technician) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Booking already has a technician assigned."
      );
    }

    const { candidates, city, skill } = await this.getBroadcastCandidates(
      booking,
      addressDetails
    );

    if (!candidates.length) {
      logger.warn("No eligible technicians to offer open booking", {
        bookingId: String(bookingId),
        city,
        skill,
      });
      return { booking, notified: 0, technicianIds: [] };
    }

    const technicianIds = candidates.map((c) => c.technician._id);

    await Promise.all(
      candidates.map((c) =>
        this.notifyTechnicianJobOffer(c.technician._id, booking, bookingId)
      )
    );

    await cacheService.invalidatePrefix(CACHE_KEYS.TECH_JOBS_PREFIX);

    logger.info("Open booking offered to eligible technicians", {
      bookingId: String(bookingId),
      notified: technicianIds.length,
      city,
      skill,
    });

    return {
      booking,
      notified: technicianIds.length,
      technicianIds,
      city,
      skill,
    };
  }

  /**
   * First technician to claim a Confirmed unassigned booking wins.
   */
  async claimOpenBooking(bookingId, technicianId) {
    await technicianRepository.ensureTechnicianReady(technicianId);

    const { booking, addressDetails } =
      await this.getBookingContext(bookingId);

    if (
      !OPEN_FOR_CLAIM_STATUSES.includes(booking.status) ||
      booking.technician
    ) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "This job was already accepted by another technician."
      );
    }

    const technician = await technicianRepository.findById(technicianId);
    if (!technician || technician.role !== "technician") {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Technician not found.");
    }
    if (!technician.isActive) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Technician account is inactive."
      );
    }
    if (technician.availability === false) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Technician is currently unavailable."
      );
    }

    const workload = await technicianRepository.getWorkload(technicianId);
    const maxWorkload = technician.maxWorkload || 5;
    if (workload >= maxWorkload) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "You have reached your maximum workload."
      );
    }

    const { candidates } = await this.getBroadcastCandidates(
      booking,
      addressDetails
    );
    const eligibleIds = new Set(
      candidates.map((c) => String(c.technician._id))
    );
    if (!eligibleIds.has(String(technicianId))) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You are not eligible for this job."
      );
    }

    const { updated, history } = await withTransaction(async (session) => {
      const claimed = await bookingRepository.claimPendingBooking(
        bookingId,
        technicianId,
        session
      );

      if (!claimed) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          "This job was already accepted by another technician."
        );
      }

      const assignmentHistory = await assignmentRepository.create(
        {
          booking: bookingId,
          technician: technicianId,
          assignedBy: technicianId,
          method: ASSIGNMENT_METHOD.CLAIM,
          reason: "Claimed by technician (first to accept).",
          matchScore: 0,
          matchDetails: {},
          previousTechnician: null,
          status: "Assigned",
        },
        session
      );

      return { updated: claimed, history: assignmentHistory };
    });

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.ASSIGNED,
      actorId: technicianId,
      actorRole: "technician",
      action: AUDIT_ACTION.ASSIGN,
      fromStatus: booking.status,
      toStatus: BOOKING_STATUS.ASSIGNED,
      note: `Technician ${technician.name} claimed the job`,
      metadata: {
        method: ASSIGNMENT_METHOD.CLAIM,
        technicianId,
      },
    });

    await this.handleAssignmentFollowUps({
      booking,
      bookingId,
      technicianId,
      assignmentMethod: ASSIGNMENT_METHOD.CLAIM,
      assignmentRecord: history,
      metadata: {
        claimed: true,
        selectedTechnicianName: technician.name,
      },
      bookingUpdated: updated,
    });

    // Customer already notified via bookingEvent ASSIGNED; also alert admins
    // and withdraw the offer from other eligible technicians.
    await this.notifyAdminsOfAssignment(booking, bookingId, technician);
    await this.withdrawOfferFromOthers(
      [...eligibleIds],
      bookingId,
      technicianId
    );

    return {
      booking: updated,
      assignment: history,
    };
  }

  // ======================================
  // Auto Assignment
  // ======================================

  async autoAssign(bookingId, adminId = null) {
    const { booking, addressDetails } =
      await this.getBookingContext(bookingId);

    await this.assertAssignable(booking);

    const { ranked, city, skill } =
      await this.rankTechnicians(booking, addressDetails);

    if (!ranked.length) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "No available technician found matching city, skills, and workload."
      );
    }

    const best = ranked[0];
    const previousTechnician = booking.technician || null;

    const { updated, history } = await withTransaction(async (session) => {
      const updatedBooking = await bookingRepository.assignTechnician(
        bookingId,
        best.technician._id,
        BOOKING_STATUS.ASSIGNED,
        session
      );

      const assignmentHistory = await assignmentRepository.create(
        {
          booking: bookingId,
          technician: best.technician._id,
          assignedBy: adminId,
          method: ASSIGNMENT_METHOD.AUTO,
          reason: `Auto-assigned based on city (${city || "n/a"}), skill (${skill}), workload, and rating.`,
          matchScore: best.priorityScore,
          matchDetails: {
            ...best.matchDetails,
            priorityScore: best.priorityScore,
          },
          previousTechnician,
          status: previousTechnician ? "Reassigned" : "Assigned",
        },
        session
      );

      return { updated: updatedBooking, history: assignmentHistory };
    });

    await bookingEventService.record({
      bookingId,
      event: previousTechnician
        ? BOOKING_TIMELINE_EVENT.REASSIGNED
        : BOOKING_TIMELINE_EVENT.ASSIGNED,
      actorId: adminId,
      actorRole: "admin",
      action: AUDIT_ACTION.ASSIGN,
      fromStatus: booking.status,
      toStatus: BOOKING_STATUS.ASSIGNED,
      note: `Auto-assigned technician ${best.technician.name}`,
      metadata: {
        method: ASSIGNMENT_METHOD.AUTO,
        priorityScore: best.priorityScore,
        technicianId: best.technician._id,
      },
    });

    await this.handleAssignmentFollowUps({
      booking,
      bookingId,
      technicianId: best.technician._id,
      assignmentMethod: ASSIGNMENT_METHOD.AUTO,
      assignmentRecord: history,
      metadata: {
        priorityScore: best.priorityScore,
        matchDetails: best.matchDetails,
        previousTechnician,
        selectedTechnicianName: best.technician.name,
      },
      bookingUpdated: updated,
    });

    return {
      booking: updated,
      assignment: history,
      candidatesEvaluated: ranked.length,
      selected: {
        technician: best.technician,
        priorityScore: best.priorityScore,
        matchDetails: best.matchDetails,
      },
    };
  }

  // ======================================
  // Manual Assignment (Admin)
  // ======================================

  async manualAssign(bookingId, technicianId, adminId, reason) {
    const { booking, addressDetails } =
      await this.getBookingContext(bookingId);

    await this.assertAssignable(booking);

    const technician =
      await technicianRepository.findById(technicianId);

    if (!technician) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician not found."
      );
    }

    if (!technician.isActive) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Technician account is inactive."
      );
    }

    if (!technician.availability) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Technician is currently unavailable."
      );
    }

    const workload =
      await technicianRepository.getWorkload(technicianId);
    const maxWorkload = technician.maxWorkload || 5;

    if (workload >= maxWorkload) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Technician has reached maximum workload."
      );
    }

    const city = this.getBookingCity(
      addressDetails,
      booking.customer
    );
    const skill = booking.serviceCategory;

    const matchDetails = this.calculatePriorityScore(technician, {
      city,
      skill,
      workload,
    });

    const previousTechnician = booking.technician || null;

    const { updated, history } = await withTransaction(async (session) => {
      const updatedBooking = await bookingRepository.assignTechnician(
        bookingId,
        technicianId,
        BOOKING_STATUS.ASSIGNED,
        session
      );

      const assignmentHistory = await assignmentRepository.create(
        {
          booking: bookingId,
          technician: technicianId,
          assignedBy: adminId,
          method: ASSIGNMENT_METHOD.MANUAL,
          reason: reason || "Manually assigned by admin.",
          matchScore: matchDetails.priorityScore,
          matchDetails: {
            ...matchDetails,
            priorityScore: matchDetails.priorityScore,
          },
          previousTechnician,
          status: previousTechnician ? "Reassigned" : "Assigned",
        },
        session
      );

      return { updated: updatedBooking, history: assignmentHistory };
    });

    await bookingEventService.record({
      bookingId,
      event: previousTechnician
        ? BOOKING_TIMELINE_EVENT.REASSIGNED
        : BOOKING_TIMELINE_EVENT.ASSIGNED,
      actorId: adminId,
      actorRole: "admin",
      action: AUDIT_ACTION.ASSIGN,
      fromStatus: booking.status,
      toStatus: BOOKING_STATUS.ASSIGNED,
      note: reason || `Manually assigned technician ${technician.name}`,
      metadata: {
        method: ASSIGNMENT_METHOD.MANUAL,
        technicianId,
        priorityScore: matchDetails.priorityScore,
      },
    });

    await this.handleAssignmentFollowUps({
      booking,
      bookingId,
      technicianId,
      assignmentMethod: ASSIGNMENT_METHOD.MANUAL,
      assignmentRecord: history,
      metadata: {
        priorityScore: matchDetails.priorityScore,
        matchDetails,
        previousTechnician,
        selectedTechnicianName: technician.name,
      },
      bookingUpdated: updated,
    });

    return {
      booking: updated,
      assignment: history,
      selected: {
        technician,
        priorityScore: matchDetails.priorityScore,
        matchDetails,
      },
    };
  }

  /**
   * Preferred technician after payment — assign on booking, then follow-ups.
   */
  async finalizePreferredAssignment(bookingId, technicianId, customerId) {
    const { booking, addressDetails } =
      await this.getBookingContext(bookingId);

    const technician =
      await technicianRepository.findById(technicianId);

    if (!technician) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician not found."
      );
    }

    if (technician.availability === false) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Preferred technician is currently unavailable."
      );
    }

    const city = this.getBookingCity(addressDetails, booking.customer);
    const skill = booking.serviceCategory;
    const workload =
      await technicianRepository.getWorkload(technicianId);
    const matchDetails = this.calculatePriorityScore(technician, {
      city,
      skill,
      workload,
    });

    const fromStatus = booking.status;

    const { updated, history } = await withTransaction(async (session) => {
      const updatedBooking = await bookingRepository.assignTechnician(
        bookingId,
        technicianId,
        BOOKING_STATUS.ASSIGNED,
        session
      );

      const assignmentHistory = await assignmentRepository.create(
        {
          booking: bookingId,
          technician: technicianId,
          assignedBy: customerId,
          method: ASSIGNMENT_METHOD.MANUAL,
          reason: "Preferred technician selected by customer.",
          matchScore: matchDetails.priorityScore,
          matchDetails: {
            ...matchDetails,
            priorityScore: matchDetails.priorityScore,
          },
          previousTechnician: null,
          status: "Assigned",
        },
        session
      );

      return { updated: updatedBooking, history: assignmentHistory };
    });

    await bookingEventService.record({
      bookingId,
      event: BOOKING_TIMELINE_EVENT.ASSIGNED,
      actorId: customerId,
      actorRole: "customer",
      action: AUDIT_ACTION.ASSIGN,
      fromStatus,
      toStatus: BOOKING_STATUS.ASSIGNED,
      note: `Preferred technician ${technician.name}`,
      metadata: {
        method: ASSIGNMENT_METHOD.MANUAL,
        preferred: true,
        technicianId,
        priorityScore: matchDetails.priorityScore,
      },
    });

    await this.handleAssignmentFollowUps({
      booking,
      bookingId,
      technicianId,
      assignmentMethod: ASSIGNMENT_METHOD.MANUAL,
      assignmentRecord: history,
      metadata: {
        priorityScore: matchDetails.priorityScore,
        matchDetails,
        preferred: true,
        selectedTechnicianName: technician.name,
      },
      bookingUpdated: updated,
    });

    return {
      booking: updated,
      assignment: history,
      selected: {
        technician,
        priorityScore: matchDetails.priorityScore,
        matchDetails,
      },
    };
  }

  async ensureChatRoom(bookingId) {
    try {
      await chatService.ensureRoomForBooking(bookingId);
    } catch (error) {
      logger.warn("Failed to ensure chat room after assignment", {
        bookingId: String(bookingId),
        message: error.message,
      });
    }
  }

  // ======================================
  // Assignment History
  // ======================================

  async getAssignmentHistory(bookingId, requester = {}) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    if (requester.role === "customer") {
      const customerId =
        booking.customer?._id?.toString() ||
        booking.customer?.toString();

      if (customerId !== requester.userId?.toString()) {
        throw new ApiError(
          HTTP_STATUS.FORBIDDEN,
          "You do not have access to this booking's assignment history."
        );
      }
    }

    const history =
      await assignmentRepository.findByBooking(bookingId);

    return {
      bookingId,
      currentTechnician: booking.technician,
      history,
    };
  }

  // ======================================
  // Available Technicians
  // ======================================

  async getAvailableTechnicians(query = {}) {
    const { page, limit } = parsePagination(query);

    const { technicians, total } =
      await technicianRepository.findAvailableTechnicians({
        city: query.city,
        skill: query.skill || query.serviceCategory,
        search: query.q || query.search,
        page,
        limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });

    const workloads = await technicianRepository.getWorkloads(
      technicians.map((t) => t._id)
    );

    const items = technicians
      .map((technician) => {
        const workload =
          workloads[technician._id.toString()] || 0;
        const maxWorkload = technician.maxWorkload || 5;

        return {
          ...technician,
          currentWorkload: workload,
          remainingCapacity: Math.max(maxWorkload - workload, 0),
          hasCapacity: workload < maxWorkload,
        };
      })
      .filter((t) => t.hasCapacity);

    return formatPaginatedResponse(items, page, limit, total);
  }

  // ======================================
  // Preview Auto Assignment Ranking
  // ======================================

  async previewAutoAssignment(bookingId) {
    const { booking, addressDetails } =
      await this.getBookingContext(bookingId);

    const { ranked, city, skill } =
      await this.rankTechnicians(booking, addressDetails);

    return {
      bookingId,
      city,
      skill,
      candidates: ranked.map((item) => ({
        technician: {
          _id: item.technician._id,
          name: item.technician.name,
          email: item.technician.email,
          city: item.technician.city,
          rating: item.technician.rating,
          skills: item.technician.skills,
          availability: item.technician.availability,
          maxWorkload: item.technician.maxWorkload,
        },
        currentWorkload: item.workload,
        priorityScore: item.priorityScore,
        matchDetails: item.matchDetails,
      })),
    };
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
}

export default new AssignmentService();
