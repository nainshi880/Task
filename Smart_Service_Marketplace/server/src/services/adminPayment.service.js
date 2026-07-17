import paymentRepository from "../repositories/payment.repository.js";
import paymentService from "./payment.service.js";
import technicianAvailabilityEarningsService from "./technicianAvailabilityEarnings.service.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import PAGINATION from "../constants/pagination.js";

class AdminPaymentService {
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

  async listTransactions(query = {}) {
    return await paymentService.listAdminPayments(query);
  }

  async getTransactionDetails(paymentId, query = {}) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payment not found.");
    }

    const auditLogs = await paymentService.getPaymentAuditLogs(
      paymentId,
      query
    );

    return { payment, auditLogs };
  }

  async getPaymentReports(query = {}) {
    return await paymentService.getAnalytics({
      from: query.from || query.fromDate,
      to: query.to || query.toDate,
    });
  }

  async getRevenueTracking(query = {}) {
    const analytics = await this.getPaymentReports(query);
    const { overview, byPurpose, dailyTrend } = analytics;

    return {
      period: {
        from: query.from || query.fromDate || null,
        to: query.to || query.toDate || null,
      },
      revenue: {
        grossCollected: overview.paidAmount || 0,
        bookingRevenue: overview.bookingPaymentAmount || 0,
        walletRecharges: overview.walletRechargeAmount || 0,
        refundedAmount: overview.refundedAmount || 0,
        netRevenue: Number(
          (
            (overview.paidAmount || 0) - (overview.refundedAmount || 0)
          ).toFixed(2)
        ),
        successRate: overview.successRate || 0,
        failureRate: overview.failureRate || 0,
      },
      byPurpose,
      dailyTrend,
      overview,
    };
  }

  async listRefunds(query = {}) {
    const { page, limit } = this.parsePagination(query);

    const { items, total } = await paymentRepository.listRefunds({
      page,
      limit,
      from: query.from || query.fromDate,
      to: query.to || query.toDate,
      customerId: query.customerId,
    });

    return this.formatPaginated(items, page, limit, total);
  }

  async processRefund(adminUser, paymentId, body, actor = {}) {
    return await paymentService.processRefund(
      adminUser,
      { paymentId, ...body },
      {
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      }
    );
  }

  async listFailedPayments(query = {}) {
    const { page, limit } = this.parsePagination(query);

    const { items, total } = await paymentRepository.listFailed({
      page,
      limit,
      from: query.from || query.fromDate,
      to: query.to || query.toDate,
      customerId: query.customerId,
    });

    return this.formatPaginated(items, page, limit, total);
  }

  async listRecoverablePayments(query = {}) {
    return await paymentService.listRecoverablePayments(query);
  }

  async recoverFailedPayment(adminId, paymentId, actor = {}) {
    return await paymentService.recoverPayment(adminId, paymentId, {
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  }

  async listTechnicianPayouts(query = {}) {
    return await technicianAvailabilityEarningsService.listAdminPayouts(query);
  }

  async processTechnicianPayout(adminId, payoutId, body, actor = {}) {
    return await technicianAvailabilityEarningsService.processPayout(
      adminId,
      payoutId,
      body,
      {
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      }
    );
  }
}

export default new AdminPaymentService();
