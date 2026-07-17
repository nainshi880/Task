import reviewRepository from "../repositories/review.repository.js";
import auditRepository from "../repositories/audit.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import PAGINATION from "../constants/pagination.js";
import AUDIT_ACTION from "../constants/auditAction.js";
import { REVIEW_STATUS, REPORT_STATUS } from "../constants/review.js";
import { invalidateAdminAnalytics } from "../utils/cacheInvalidation.js";

class AdminReviewService {
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

  formatPaginated(items, page, limit, total) {
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

  async writeAudit({
    actorId,
    reviewId,
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
        resource: "Review",
        resourceId: reviewId,
        description,
        metadata,
        ipAddress: ip,
        userAgent,
      });
    } catch {
      // non-blocking
    }
  }

  buildListOptions(query) {
    const { page, limit } = this.parsePagination(query);
    return {
      page,
      limit,
      status: query.status,
      technicianId: query.technicianId,
      customerId: query.customerId,
      rating: query.rating,
      minRating: query.minRating,
      maxRating: query.maxRating,
      reportedOnly: query.reported === true || query.reported === "true",
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };
  }

  async listReviews(query = {}) {
    const options = this.buildListOptions(query);
    const { items, total } = await reviewRepository.list(options);
    return this.formatPaginated(items, options.page, options.limit, total);
  }

  async listReportedReviews(query = {}) {
    return this.listReviews({ ...query, reported: true });
  }

  async getReviewDetails(reviewId) {
    const review = await reviewRepository.findById(reviewId);
    if (!review || review.isDeleted) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Review not found.");
    }
    return review;
  }

  async moderateReview(reviewId, adminId, { status, note } = {}, actor = {}) {
    const review = await reviewRepository.findById(reviewId);

    if (!review || review.isDeleted) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Review not found.");
    }

    if (![REVIEW_STATUS.APPROVED, REVIEW_STATUS.REJECTED, REVIEW_STATUS.HIDDEN].includes(status)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid moderation status."
      );
    }

    const updated = await reviewRepository.update(reviewId, {
      status,
      moderatedBy: adminId,
      moderatedAt: new Date(),
      moderationNote: note || "",
    });

    await reviewRepository.recalculateTechnicianRating(
      review.technician._id || review.technician
    );

    await invalidateAdminAnalytics();

    const action =
      status === REVIEW_STATUS.APPROVED
        ? AUDIT_ACTION.APPROVE
        : AUDIT_ACTION.REJECT;

    await this.writeAudit({
      actorId: adminId,
      reviewId,
      action,
      description: `Review moderated as ${status}`,
      metadata: { status, note },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      review: updated,
      message: `Review ${status} successfully.`,
    };
  }

  async approveReview(reviewId, adminId, body, actor) {
    return this.moderateReview(
      reviewId,
      adminId,
      { status: REVIEW_STATUS.APPROVED, note: body?.note },
      actor
    );
  }

  async rejectReview(reviewId, adminId, body, actor) {
    return this.moderateReview(
      reviewId,
      adminId,
      { status: REVIEW_STATUS.REJECTED, note: body?.note || body?.reason },
      actor
    );
  }

  async deleteReview(reviewId, adminId, { reason } = {}, actor = {}) {
    const review = await reviewRepository.findById(reviewId);

    if (!review || review.isDeleted) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Review not found.");
    }

    const technicianId = review.technician._id || review.technician;

    const updated = await reviewRepository.softDelete(reviewId, adminId);

    await reviewRepository.recalculateTechnicianRating(technicianId);

    await invalidateAdminAnalytics();

    await this.writeAudit({
      actorId: adminId,
      reviewId,
      action: AUDIT_ACTION.DELETE,
      description: reason || "Inappropriate review deleted by admin",
      metadata: { reason },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      review: updated,
      message: "Review deleted successfully.",
    };
  }

  async resolveReport(
    reviewId,
    reportId,
    adminId,
    { status, note } = {},
    actor = {}
  ) {
    const review = await reviewRepository.findById(reviewId);
    if (!review || review.isDeleted) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Review not found.");
    }

    const reportStatus =
      status === REPORT_STATUS.DISMISSED
        ? REPORT_STATUS.DISMISSED
        : REPORT_STATUS.RESOLVED;

    const updated = await reviewRepository.resolveReport(
      reviewId,
      reportId,
      adminId,
      reportStatus
    );

    if (!updated) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Report not found.");
    }

    await this.writeAudit({
      actorId: adminId,
      reviewId,
      action: AUDIT_ACTION.UPDATE,
      description: `Review report ${reportStatus}`,
      metadata: { reportId, status: reportStatus, note },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      review: updated,
      message: `Report marked as ${reportStatus}.`,
    };
  }

  async getRatingAnalytics(query = {}) {
    return await reviewRepository.getAnalytics({
      fromDate: query.fromDate || query.from,
      toDate: query.toDate || query.to,
      technicianId: query.technicianId,
    });
  }
}

export default new AdminReviewService();
