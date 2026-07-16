import technicianProfileRepository from "../repositories/technicianProfile.repository.js";
import earningsRepository from "../repositories/earnings.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import PAGINATION from "../constants/pagination.js";
import AUDIT_ACTION from "../constants/auditAction.js";
import { PAYOUT_STATUS } from "../models/Payout.js";
import withTransaction from "../utils/transaction.js";
import { writePaymentAudit } from "../utils/paymentAudit.js";

class TechnicianAvailabilityEarningsService {
  computeEffectiveAvailability(profile) {
    const onVacation = this.isCurrentlyOnVacation(profile);
    const online = profile.onlineStatus === true;
    const availableFlag = profile.availabilityStatus !== false;

    return {
      isOnline: online,
      isOnVacation: onVacation,
      isAvailableForJobs: online && !onVacation && availableFlag,
    };
  }

  isCurrentlyOnVacation(profile) {
    if (!profile?.vacationMode) return false;

    const now = new Date();
    if (profile.vacationStart && now < new Date(profile.vacationStart)) {
      return false;
    }
    if (profile.vacationEnd && now > new Date(profile.vacationEnd)) {
      return false;
    }
    return true;
  }

  async syncAvailabilityToUser(userId, profile) {
    const effective = this.computeEffectiveAvailability(profile);
    await technicianProfileRepository.syncUserFields(userId, {
      availability: effective.isAvailableForJobs,
    });
    return effective;
  }

  async ensureProfile(userId) {
    const profile =
      await technicianProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found. Create profile first."
      );
    }

    return profile;
  }

  // ======================================
  // Get Availability Settings
  // ======================================

  async getAvailabilitySettings(userId) {
    const settings =
      await technicianProfileRepository.getAvailabilitySettings(userId);

    if (!settings) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found."
      );
    }

    return {
      ...settings.toObject(),
      ...this.computeEffectiveAvailability(settings),
    };
  }

  // ======================================
  // Online / Offline
  // ======================================

  async setOnlineStatus(userId, onlineStatus) {
    await this.ensureProfile(userId);

    const profile =
      await technicianProfileRepository.updateOnlineStatus(
        userId,
        onlineStatus
      );

    const effective = await this.syncAvailabilityToUser(userId, profile);

    return {
      onlineStatus: profile.onlineStatus,
      vacationMode: profile.vacationMode,
      availabilityStatus: profile.availabilityStatus,
      ...effective,
    };
  }

  // ======================================
  // Vacation Mode
  // ======================================

  async setVacationMode(userId, data) {
    await this.ensureProfile(userId);

    const vacationMode = data.vacationMode === true;

    if (vacationMode) {
      if (data.vacationStart && data.vacationEnd) {
        if (new Date(data.vacationEnd) < new Date(data.vacationStart)) {
          throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            "vacationEnd must be after vacationStart."
          );
        }
      }
    }

    const update = {
      vacationMode,
      vacationReason: data.vacationReason || null,
    };

    if (vacationMode) {
      update.vacationStart = data.vacationStart
        ? new Date(data.vacationStart)
        : new Date();
      update.vacationEnd = data.vacationEnd
        ? new Date(data.vacationEnd)
        : null;
    } else {
      update.vacationStart = null;
      update.vacationEnd = null;
      update.vacationReason = null;
    }

    const profile =
      await technicianProfileRepository.updateVacationMode(
        userId,
        update
      );

    const effective = await this.syncAvailabilityToUser(userId, profile);

    return {
      vacationMode: profile.vacationMode,
      vacationStart: profile.vacationStart,
      vacationEnd: profile.vacationEnd,
      vacationReason: profile.vacationReason,
      onlineStatus: profile.onlineStatus,
      ...effective,
    };
  }

  // ======================================
  // Service Areas
  // ======================================

  async updateServiceAreas(userId, serviceAreas) {
    await this.ensureProfile(userId);

    if (!Array.isArray(serviceAreas) || serviceAreas.length === 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Service areas must be a non-empty array."
      );
    }

    const cleaned = [
      ...new Set(
        serviceAreas
          .map((area) => String(area).trim())
          .filter(Boolean)
      ),
    ];

    const profile =
      await technicianProfileRepository.updateServiceAreas(
        userId,
        cleaned
      );

    // Keep primary working city in sync with first service area if empty mismatch
    if (cleaned.length && profile.workingCity !== cleaned[0]) {
      await technicianProfileRepository.syncUserFields(userId, {
        city: profile.workingCity || cleaned[0],
      });
    }

    return {
      workingCity: profile.workingCity,
      serviceAreas: profile.serviceAreas,
    };
  }

  // ======================================
  // Working Hours (delegate)
  // ======================================

  async updateWorkingHours(userId, workingHours) {
    await this.ensureProfile(userId);
    return await technicianProfileRepository.updateWorkingHours(
      userId,
      workingHours
    );
  }

  // ======================================
  // Earnings Summary
  // ======================================

  async getEarningsSummary(userId) {
    await this.ensureProfile(userId);
    return await earningsRepository.getEarningsSummary(userId);
  }

  // ======================================
  // Monthly Earnings
  // ======================================

  async getMonthlyEarnings(userId, query = {}) {
    await this.ensureProfile(userId);

    const now = new Date();
    const year = parseInt(query.year, 10) || now.getFullYear();
    const month = parseInt(query.month, 10) || now.getMonth() + 1;

    if (month < 1 || month > 12) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "month must be between 1 and 12."
      );
    }

    return await earningsRepository.getMonthlyEarnings(
      userId,
      year,
      month
    );
  }

  // ======================================
  // Payout History
  // ======================================

  parsePagination(query = {}) {
    let page = parseInt(query.page, 10);
    let limit = parseInt(query.limit, 10);

    if (Number.isNaN(page) || page < 1) page = PAGINATION.DEFAULT_PAGE;
    if (Number.isNaN(limit) || limit < PAGINATION.MIN_LIMIT) {
      limit = PAGINATION.DEFAULT_LIMIT;
    }
    if (limit > PAGINATION.MAX_LIMIT) limit = PAGINATION.MAX_LIMIT;

    return { page, limit };
  }

  async getPayoutHistory(userId, query = {}) {
    await this.ensureProfile(userId);
    const { page, limit } = this.parsePagination(query);

    const { items, total } =
      await earningsRepository.getPayoutHistory(userId, {
        page,
        limit,
        status: query.status,
      });

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
  // Request Payout
  // ======================================

  async requestPayout(userId, data = {}) {
    await this.ensureProfile(userId);

    const summary =
      await earningsRepository.getEarningsSummary(userId);

    if (summary.availableForPayout <= 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "No earnings available for payout."
      );
    }

    const amount =
      data.amount !== undefined
        ? Number(data.amount)
        : summary.availableForPayout;

    if (Number.isNaN(amount) || amount <= 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payout amount must be greater than 0."
      );
    }

    if (amount > summary.availableForPayout) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Payout amount cannot exceed available balance (${summary.availableForPayout}).`
      );
    }

    const now = new Date();
    const periodStart = data.periodStart
      ? new Date(data.periodStart)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = data.periodEnd
      ? new Date(data.periodEnd)
      : now;

    const bookings =
      await earningsRepository.getUnpaidCompletedBookings(
        userId,
        periodStart,
        periodEnd
      );

    const payout = await withTransaction(async (session) => {
      return await earningsRepository.createPayout(
        {
          technician: userId,
          amount,
          currency: data.currency || "INR",
          status: PAYOUT_STATUS.PENDING,
          periodStart,
          periodEnd,
          method: data.method || "Bank Transfer",
          jobsCount: bookings.length,
          bookingIds: bookings.map((b) => b._id),
          notes: data.notes || "Payout requested by technician",
          requestedAt: new Date(),
        },
        session
      );
    });

    await writePaymentAudit({
      actorId: userId,
      action: AUDIT_ACTION.PAYOUT_REQUEST,
      resource: "Payout",
      resourceId: payout._id,
      description: "Technician payout requested",
      metadata: { amount, jobsCount: bookings.length },
    });

    return payout;
  }

  // ======================================
  // Admin — Payout Processing
  // ======================================

  async listAdminPayouts(query = {}) {
    const { page, limit } = this.parsePagination(query);
    const { items, total } = await earningsRepository.listAllPayouts({
      page,
      limit,
      status: query.status,
      technicianId: query.technicianId,
    });

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

  async processPayout(adminId, payoutId, data = {}, meta = {}) {
    const payout = await earningsRepository.findPayoutById(payoutId);

    if (!payout) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payout not found.");
    }

    const status = data.status;
    const allowed = Object.values(PAYOUT_STATUS);
    if (!allowed.includes(status)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Invalid payout status. Allowed: ${allowed.join(", ")}`
      );
    }

    if (
      payout.status === PAYOUT_STATUS.PAID &&
      status !== PAYOUT_STATUS.PAID
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Paid payouts cannot change status."
      );
    }

    const update = {
      status,
      processedBy: adminId,
      notes: data.notes !== undefined ? data.notes : payout.notes,
      transactionId:
        data.transactionId !== undefined
          ? data.transactionId
          : payout.transactionId,
    };

    if (status === PAYOUT_STATUS.PAID) {
      update.paidAt = new Date();
    }

    if (status === PAYOUT_STATUS.FAILED || status === PAYOUT_STATUS.CANCELLED) {
      update.paidAt = null;
    }

    const updated = await earningsRepository.updatePayoutStatus(
      payoutId,
      update
    );

    await writePaymentAudit({
      actorId: adminId,
      action: AUDIT_ACTION.PAYOUT_PROCESS,
      resource: "Payout",
      resourceId: payoutId,
      description: `Payout status updated to ${status}`,
      metadata: {
        previousStatus: payout.status,
        status,
        transactionId: update.transactionId,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return updated;
  }
}

export default new TechnicianAvailabilityEarningsService();
