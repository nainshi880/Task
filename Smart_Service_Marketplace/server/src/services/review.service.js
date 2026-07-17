import reviewRepository from "../repositories/review.repository.js";
import bookingRepository from "../repositories/booking.repository.js";
import technicianRepository from "../repositories/technician.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import BOOKING_STATUS from "../constants/bookingStatus.js";
import { REVIEW_STATUS } from "../constants/review.js";
import ROLES from "../constants/roles.js";
import {
  parsePagination,
  parseSort,
  formatPaginatedResponse,
} from "../utils/pagination.js";

const REVIEWABLE_STATUSES = [
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.CLOSED,
];

class ReviewService {
  async submitReview(customerId, { bookingId, rating, title, comment }) {
    const booking = await bookingRepository.findById(bookingId);

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    if (booking.customer._id.toString() !== customerId.toString()) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Access denied.");
    }

    if (!REVIEWABLE_STATUSES.includes(booking.status)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Reviews can only be submitted for completed bookings."
      );
    }

    if (!booking.technician) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "No technician assigned to this booking."
      );
    }

    const existing = await reviewRepository.findByBooking(bookingId);
    if (existing) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "You have already reviewed this booking."
      );
    }

    const review = await reviewRepository.create({
      booking: bookingId,
      customer: customerId,
      technician: booking.technician._id || booking.technician,
      rating,
      title: title || "",
      comment: comment || "",
      status: REVIEW_STATUS.PENDING,
    });

    return await reviewRepository.findById(review._id);
  }

  async getTechnicianReviews(technicianId, query = {}) {
    const technician = await technicianRepository.findById(technicianId);
    if (!technician) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Technician not found.");
    }

    const { page, limit } = parsePagination(query);
    const { sortBy, sortOrder } = parseSort(query, ["createdAt", "rating"]);

    const [{ items, total }, rating, distribution] = await Promise.all([
      reviewRepository.listByTechnician(technicianId, {
        page,
        limit,
        sortBy,
        sortOrder,
      }),
      reviewRepository.getTechnicianRatingStats(technicianId),
      reviewRepository.getRatingDistribution(technicianId),
    ]);

    return formatPaginatedResponse(items, page, limit, total, {
      technician: {
        _id: technician._id,
        name: technician.name,
        avatar: technician.avatar,
        rating: rating.averageRating,
      },
      rating: {
        average: rating.averageRating,
        totalReviews: rating.totalReviews,
        distribution,
      },
    });
  }

  async updateReview(customerId, reviewId, { rating, title, comment }) {
    const review = await reviewRepository.findActiveById(reviewId);

    if (!review) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Review not found.");
    }

    if (review.customer.toString() !== customerId.toString()) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Access denied.");
    }

    const wasApproved = review.status === REVIEW_STATUS.APPROVED;
    const update = {};

    if (rating !== undefined) update.rating = rating;
    if (title !== undefined) update.title = title;
    if (comment !== undefined) update.comment = comment;

    if (wasApproved) {
      update.status = REVIEW_STATUS.PENDING;
      update.moderatedBy = null;
      update.moderatedAt = null;
      update.moderationNote = "";
    }

    const updated = await reviewRepository.update(reviewId, update);

    if (wasApproved) {
      await reviewRepository.recalculateTechnicianRating(review.technician);
    }

    return updated;
  }

  async deleteReview(customerId, reviewId) {
    const review = await reviewRepository.findActiveById(reviewId);

    if (!review) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Review not found.");
    }

    if (review.customer.toString() !== customerId.toString()) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Access denied.");
    }

    const wasApproved = review.status === REVIEW_STATUS.APPROVED;
    const technicianId = review.technician;

    const updated = await reviewRepository.customerSoftDelete(reviewId, customerId);

    if (wasApproved) {
      await reviewRepository.recalculateTechnicianRating(technicianId);
    }

    return updated;
  }

  async reportReview(userId, reviewId, { reason }) {
    const review = await reviewRepository.findById(reviewId);

    if (!review || review.isDeleted) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Review not found.");
    }

    if (review.status !== REVIEW_STATUS.APPROVED) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only approved reviews can be reported."
      );
    }

    const updated = await reviewRepository.addReport(reviewId, {
      reportedBy: userId,
      reason,
    });

    if (!updated) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Review not found.");
    }

    return updated;
  }

  async getBookingReview(userId, bookingId, role) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    const isCustomer =
      booking.customer._id.toString() === userId.toString();
    const isTechnician =
      booking.technician &&
      booking.technician._id.toString() === userId.toString();

    if (role !== ROLES.ADMIN && !isCustomer && !isTechnician) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Access denied.");
    }

    const review = await reviewRepository.findByBooking(bookingId);
    if (!review) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Review not found.");
    }

    return await reviewRepository.findById(review._id);
  }
}

export default new ReviewService();
