import bookingService from "./booking.service.js";
import notificationService from "./notification.service.js";
import paymentService from "./payment.service.js";
import walletService from "./wallet.service.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import PAGINATION from "../constants/pagination.js";
import ROLES from "../constants/roles.js";

const BATCH_HANDLERS = {
  bookings: (user, query) =>
    bookingService.getCustomerBookings(user._id, query),

  notifications: (user, query) =>
    notificationService.list(user._id, query),

  payments: (user, query) =>
    paymentService.listMyPayments(user._id, query),

  wallet: async (user) => {
    const balance = await walletService.getBalance(user._id);
    return { balance };
  },
};

class BatchService {
  getHandler(resource, role) {
    if (resource === "bookings" && role !== ROLES.CUSTOMER) {
      return null;
    }

    if (
      (resource === "payments" || resource === "wallet") &&
      role !== ROLES.CUSTOMER
    ) {
      return null;
    }

    return BATCH_HANDLERS[resource] || null;
  }

  async execute(user, { requests = [] } = {}) {
    if (!Array.isArray(requests) || requests.length === 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "At least one batch request is required."
      );
    }

    if (requests.length > PAGINATION.BATCH_MAX_REQUESTS) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Maximum ${PAGINATION.BATCH_MAX_REQUESTS} requests per batch.`
      );
    }

    const results = await Promise.all(
      requests.map(async (request) => {
        const id = request.id || request.resource;
        const resource = request.resource;

        if (!resource) {
          return {
            id,
            success: false,
            error: "Resource is required.",
          };
        }

        const handler = this.getHandler(resource, user.role);

        if (!handler) {
          return {
            id,
            resource,
            success: false,
            error: "Resource not available for this role.",
          };
        }

        try {
          const data = await handler(user, request.query || {});
          return {
            id,
            resource,
            success: true,
            data,
          };
        } catch (error) {
          return {
            id,
            resource,
            success: false,
            error: error.message || "Request failed.",
          };
        }
      })
    );

    return {
      count: results.length,
      results,
    };
  }
}

export default new BatchService();
