import bookingRepository from "../repositories/booking.repository.js";
import technicianRepository from "../repositories/technician.repository.js";
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
import BOOKING_STATUS from "../constants/bookingStatus.js";
import ASSIGNMENT_METHOD, {
  ASSIGNMENT_PRIORITY_WEIGHTS,
} from "../constants/assignment.js";
import PAGINATION from "../constants/pagination.js";
import BOOKING_TIMELINE_EVENT from "../constants/bookingTimelineEvent.js";
import AUDIT_ACTION from "../constants/auditAction.js";
import withTransaction from "../utils/transaction.js";

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

    if (
      ![
        BOOKING_STATUS.PENDING,
        BOOKING_STATUS.ASSIGNED,
      ].includes(booking.status)
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Technician can only be assigned when booking is Pending or Assigned."
      );
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Cannot assign technician to a cancelled booking."
      );
    }
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

    await this.ensureChatRoom(bookingId);

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

    await this.ensureChatRoom(bookingId);

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
