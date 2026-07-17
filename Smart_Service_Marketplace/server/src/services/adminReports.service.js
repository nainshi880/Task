import adminBookingService from "./adminBooking.service.js";
import adminPaymentService from "./adminPayment.service.js";
import adminAnalyticsService from "./adminAnalytics.service.js";
import bookingRepository from "../repositories/booking.repository.js";
import paymentRepository from "../repositories/payment.repository.js";

class AdminReportsService {
  parsePeriod(query = {}) {
    return {
      from: query.from || query.fromDate || query.startDate || null,
      to: query.to || query.toDate || query.endDate || null,
    };
  }

  async getBookingReports(query = {}) {
    return await adminBookingService.getReports({
      fromDate: query.from || query.fromDate,
      toDate: query.to || query.toDate,
      status: query.status,
      category: query.category || query.serviceCategory,
    });
  }

  async getRevenueReports(query = {}) {
    return await adminPaymentService.getRevenueTracking(query);
  }

  async getPaymentReports(query = {}) {
    return await adminPaymentService.getPaymentReports(query);
  }

  async getMonthlyReports(query = {}) {
    return await adminAnalyticsService.getMonthlyReports(query);
  }

  async getBookingCsvRows(query = {}) {
    const period = this.parsePeriod(query);
    const report = await this.getBookingReports(query);
    const details = await bookingRepository.listForReportExport({
      fromDate: period.from,
      toDate: period.to,
      status: query.status,
      serviceCategory: query.category || query.serviceCategory,
    });

    const summaryRows = [
      {
        section: "summary",
        metric: "totalBookings",
        value: report.periodReport.summary.totalBookings,
        status: "",
        category: "",
        amount: "",
        paymentStatus: "",
        bookingDate: "",
        createdAt: "",
      },
      {
        section: "summary",
        metric: "totalRevenue",
        value: report.periodReport.summary.totalRevenue,
        status: "",
        category: "",
        amount: "",
        paymentStatus: "",
        bookingDate: "",
        createdAt: "",
      },
      {
        section: "summary",
        metric: "paidRevenue",
        value: report.periodReport.summary.paidRevenue,
        status: "",
        category: "",
        amount: "",
        paymentStatus: "",
        bookingDate: "",
        createdAt: "",
      },
    ];

    const statusRows = report.periodReport.byStatus.map((row) => ({
      section: "by_status",
      metric: "",
      value: row.count,
      status: row.status,
      category: "",
      amount: row.revenue,
      paymentStatus: "",
      bookingDate: "",
      createdAt: "",
    }));

    const categoryRows = report.periodReport.byCategory.map((row) => ({
      section: "by_category",
      metric: "",
      value: row.count,
      status: "",
      category: row.category,
      amount: row.revenue,
      paymentStatus: "",
      bookingDate: "",
      createdAt: "",
    }));

    const detailRows = details.map((booking) => ({
      section: "booking",
      metric: "",
      value: "",
      status: booking.status,
      category: booking.serviceCategory,
      amount: booking.amount,
      paymentStatus: booking.paymentStatus,
      bookingDate: booking.bookingDate
        ? new Date(booking.bookingDate).toISOString().slice(0, 10)
        : "",
      createdAt: booking.createdAt
        ? new Date(booking.createdAt).toISOString()
        : "",
      serviceName: booking.serviceName,
      bookingId: booking._id?.toString(),
    }));

    return {
      filename: `booking-report-${Date.now()}.csv`,
      headers: [
        "section",
        "metric",
        "value",
        "status",
        "category",
        "amount",
        "paymentStatus",
        "bookingDate",
        "createdAt",
        "serviceName",
        "bookingId",
      ],
      rows: [...summaryRows, ...statusRows, ...categoryRows, ...detailRows],
    };
  }

  async getRevenueCsvRows(query = {}) {
    const report = await this.getRevenueReports(query);

    const summaryRows = [
      {
        section: "summary",
        date: "",
        metric: "grossCollected",
        value: report.revenue.grossCollected,
        purpose: "",
        count: "",
      },
      {
        section: "summary",
        date: "",
        metric: "netRevenue",
        value: report.revenue.netRevenue,
        purpose: "",
        count: "",
      },
      {
        section: "summary",
        date: "",
        metric: "refundedAmount",
        value: report.revenue.refundedAmount,
        purpose: "",
        count: "",
      },
    ];

    const trendRows = (report.dailyTrend || []).map((row) => ({
      section: "daily_trend",
      date: row.date || row._id,
      metric: "",
      value: row.amount || row.revenue || 0,
      purpose: "",
      count: row.count || "",
    }));

    const purposeRows = (report.byPurpose || []).map((row) => ({
      section: "by_purpose",
      date: "",
      metric: "",
      value: row.amount || row.revenue || 0,
      purpose: row.purpose || row._id,
      count: row.count || "",
    }));

    return {
      filename: `revenue-report-${Date.now()}.csv`,
      headers: ["section", "date", "metric", "value", "purpose", "count"],
      rows: [...summaryRows, ...trendRows, ...purposeRows],
    };
  }

  async getPaymentCsvRows(query = {}) {
    const period = this.parsePeriod(query);
    const report = await this.getPaymentReports(query);
    const transactions = await paymentRepository.listForReportExport({
      from: period.from,
      to: period.to,
    });

    const overview = report.overview || {};
    const summaryRows = [
      {
        section: "summary",
        paymentId: "",
        customer: "",
        amount: overview.paidAmount || 0,
        status: "paid_total",
        purpose: "",
        method: "",
        createdAt: "",
      },
      {
        section: "summary",
        paymentId: "",
        customer: "",
        amount: overview.refundedAmount || 0,
        status: "refunded_total",
        purpose: "",
        method: "",
        createdAt: "",
      },
    ];

    const detailRows = transactions.map((payment) => ({
      section: "payment",
      paymentId: payment._id?.toString(),
      customer: payment.customer?.email || payment.customer?.name || "",
      amount: payment.amount,
      status: payment.status,
      purpose: payment.purpose,
      method: payment.method || "",
      createdAt: payment.createdAt
        ? new Date(payment.createdAt).toISOString()
        : "",
    }));

    return {
      filename: `payment-report-${Date.now()}.csv`,
      headers: [
        "section",
        "paymentId",
        "customer",
        "amount",
        "status",
        "purpose",
        "method",
        "createdAt",
      ],
      rows: [...summaryRows, ...detailRows],
    };
  }
}

export default new AdminReportsService();
