import bookingRepository from "../repositories/booking.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import PAGINATION from "../constants/pagination.js";
import cacheService, {
  CACHE_KEYS,
  CACHE_TTL,
} from "../utils/cache.js";

class BookingAnalyticsService {
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

  parseSort(query = {}) {
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "bookingDate",
      "amount",
      "status",
      "serviceCategory",
      "serviceName",
    ];

    const sortBy = allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : "createdAt";

    const sortOrder =
      query.sortOrder === "asc" ? "asc" : "desc";

    return { sortBy, sortOrder };
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

  buildQueryOptions(query = {}) {
    const { page, limit } = this.parsePagination(query);
    const { sortBy, sortOrder } = this.parseSort(query);

    return {
      search: query.q || query.search,
      status: query.status,
      serviceCategory: query.category || query.serviceCategory,
      fromDate: query.fromDate || query.startDate,
      toDate: query.toDate || query.endDate,
      paymentStatus: query.paymentStatus,
      customerId: query.customerId,
      technicianId: query.technicianId,
      page,
      limit,
      sortBy,
      sortOrder,
    };
  }

  // ======================================
  // Search Bookings
  // ======================================

  async searchBookings(query = {}) {
    const search = query.q || query.search || "";

    if (!search.trim()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Search query (q) is required."
      );
    }

    const options = this.buildQueryOptions(query);
    const { bookings, total } =
      await bookingRepository.searchBookings(options);

    return this.formatPaginatedResponse(
      bookings,
      options.page,
      options.limit,
      total
    );
  }

  // ======================================
  // Filter Bookings
  // ======================================

  async filterBookings(query = {}) {
    const options = this.buildQueryOptions(query);

    if (
      !options.status &&
      !options.serviceCategory &&
      !options.fromDate &&
      !options.toDate &&
      !options.paymentStatus
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "At least one filter is required (status, category, fromDate, toDate, or paymentStatus)."
      );
    }

    const { bookings, total } =
      await bookingRepository.searchBookings(options);

    return this.formatPaginatedResponse(
      bookings,
      options.page,
      options.limit,
      total
    );
  }

  // ======================================
  // List Bookings (paginated + optional filters)
  // ======================================

  async listBookings(query = {}) {
    const options = this.buildQueryOptions(query);
    const { bookings, total } =
      await bookingRepository.searchBookings(options);

    return this.formatPaginatedResponse(
      bookings,
      options.page,
      options.limit,
      total
    );
  }

  // ======================================
  // Dashboard Analytics
  // ======================================

  async getDashboardAnalytics() {
    const cached = await cacheService.get(CACHE_KEYS.BOOKING_ANALYTICS);
    if (cached) {
      return { ...cached, cached: true };
    }

    const analytics = await bookingRepository.getDashboardAnalytics();
    await cacheService.set(
      CACHE_KEYS.BOOKING_ANALYTICS,
      analytics,
      CACHE_TTL.ANALYTICS
    );

    return { ...analytics, cached: false };
  }
}

export default new BookingAnalyticsService();
