import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import WebhookEvent from "../models/WebhookEvent.js";
import PAYMENT_STATUS from "../constants/paymentStatus.js";

class PaymentRepository {
  async create(paymentData, session = null) {
    if (session) {
      const [doc] = await Payment.create([paymentData], { session });
      return doc;
    }
    return await Payment.create(paymentData);
  }

  async findById(paymentId) {
    return await Payment.findById(paymentId)
      .populate("booking", "serviceName serviceCategory amount paymentStatus status")
      .populate("customer", "name email phone");
  }

  async findByOrderId(razorpayOrderId) {
    return await Payment.findOne({ razorpayOrderId })
      .populate("booking", "serviceName serviceCategory amount paymentStatus status")
      .populate("customer", "name email phone");
  }

  async findByPaymentId(razorpayPaymentId) {
    return await Payment.findOne({ razorpayPaymentId });
  }

  async findByBooking(bookingId) {
    return await Payment.find({ booking: bookingId }).sort({
      createdAt: -1,
    });
  }

  async findLatestPaidByBooking(bookingId) {
    return await Payment.findOne({
      booking: bookingId,
      purpose: "booking",
      status: {
        $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUNDED],
      },
    }).sort({ paidAt: -1, createdAt: -1 });
  }

  async findLatestByBooking(bookingId) {
    return await Payment.findOne({ booking: bookingId }).sort({
      createdAt: -1,
    });
  }

  async findLatestFailedOrPendingByBooking(bookingId, customerId) {
    return await Payment.findOne({
      booking: bookingId,
      customer: customerId,
      purpose: "booking",
      status: {
        $in: [PAYMENT_STATUS.FAILED, PAYMENT_STATUS.PENDING, PAYMENT_STATUS.CREATED],
      },
    }).sort({ createdAt: -1 });
  }

  async findByCustomer(customerId, { page = 1, limit = 10, status } = {}) {
    const filter = { customer: customerId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          "booking",
          "serviceName serviceCategory amount status paymentStatus"
        ),
      Payment.countDocuments(filter),
    ]);

    return { items, total };
  }

  async listAdmin({
    page = 1,
    limit = 10,
    status,
    purpose,
    customerId,
    from,
    to,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (purpose) filter.purpose = purpose;
    if (customerId) filter.customer = customerId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    if (search?.trim()) {
      const term = search.trim();
      filter.$or = [
        { razorpayOrderId: { $regex: term, $options: "i" } },
        { razorpayPaymentId: { $regex: term, $options: "i" } },
        { transactionId: { $regex: term, $options: "i" } },
      ];
    }

    const allowedSort = ["createdAt", "amount", "status", "updatedAt"];
    const sortField = allowedSort.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Payment.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .select(
          "amount status purpose method currency razorpayOrderId razorpayPaymentId transactionId refundedAmount createdAt updatedAt customer booking"
        )
        .populate("customer", "name email phone")
        .populate(
          "booking",
          "serviceName serviceCategory amount status paymentStatus"
        )
        .lean(),
      Payment.countDocuments(filter),
    ]);

    return { items, total };
  }

  async listRefunds({
    page = 1,
    limit = 10,
    from,
    to,
    customerId,
  } = {}) {
    const filter = {
      $or: [
        { status: PAYMENT_STATUS.REFUNDED },
        { refundedAmount: { $gt: 0 } },
      ],
    };

    if (customerId) filter.customer = customerId;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Payment.find(filter)
        .sort({ refundedAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customer", "name email phone")
        .populate(
          "booking",
          "serviceName serviceCategory amount status paymentStatus"
        ),
      Payment.countDocuments(filter),
    ]);

    return { items, total };
  }

  async listFailed({
    page = 1,
    limit = 10,
    from,
    to,
    customerId,
  } = {}) {
    const filter = { status: PAYMENT_STATUS.FAILED };
    if (customerId) filter.customer = customerId;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Payment.find(filter)
        .sort({ failedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customer", "name email phone")
        .populate(
          "booking",
          "serviceName serviceCategory amount status paymentStatus"
        ),
      Payment.countDocuments(filter),
    ]);

    return { items, total };
  }

  async findFailedForRecovery({ olderThanMinutes = 15, limit = 50 } = {}) {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    return await Payment.find({
      status: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.FAILED] },
      purpose: "booking",
      razorpayOrderId: { $exists: true, $ne: null },
      updatedAt: { $lte: cutoff },
    })
      .sort({ updatedAt: 1 })
      .limit(limit)
      .populate("customer", "name email")
      .populate("booking", "serviceName amount paymentStatus");
  }

  async updateById(paymentId, updateData, session = null) {
    const opts = { new: true, runValidators: true };
    if (session) opts.session = session;
    return await Payment.findByIdAndUpdate(paymentId, updateData, opts)
      .populate("booking", "serviceName serviceCategory amount paymentStatus status")
      .populate("customer", "name email phone");
  }

  async updateByOrderId(razorpayOrderId, updateData) {
    return await Payment.findOneAndUpdate(
      { razorpayOrderId },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );
  }

  async markPaid(paymentId, data, session = null) {
    const opts = { new: true };
    if (session) opts.session = session;
    return await Payment.findByIdAndUpdate(
      paymentId,
      {
        status: PAYMENT_STATUS.PAID,
        razorpayPaymentId: data.razorpayPaymentId,
        razorpaySignature: data.razorpaySignature,
        method: data.method,
        paidAt: new Date(),
        failureReason: null,
        failureCode: null,
      },
      opts
    );
  }

  async markFailed(paymentId, data = {}, session = null) {
    const opts = { new: true };
    if (session) opts.session = session;
    return await Payment.findByIdAndUpdate(
      paymentId,
      {
        status: PAYMENT_STATUS.FAILED,
        failureReason: data.failureReason || "Payment failed",
        failureCode: data.failureCode || null,
        razorpayPaymentId: data.razorpayPaymentId || null,
        failedAt: new Date(),
      },
      opts
    );
  }

  async markRefunded(paymentId, data, session = null) {
    const opts = { new: true };
    if (session) opts.session = session;
    return await Payment.findByIdAndUpdate(
      paymentId,
      {
        $set: {
          status: PAYMENT_STATUS.REFUNDED,
          refundedAt: new Date(),
          refundedAmount: data.refundedAmount,
        },
        $push: {
          refunds: {
            razorpayRefundId: data.razorpayRefundId || null,
            amount: data.amount,
            status: data.refundStatus || "processed",
            reason: data.reason || null,
            method: data.method || "razorpay",
            createdAt: new Date(),
          },
        },
      },
      opts
    );
  }

  async incrementRetry(paymentId, session = null) {
    const opts = { new: true };
    if (session) opts.session = session;
    return await Payment.findByIdAndUpdate(
      paymentId,
      {
        $inc: { retryCount: 1 },
        $set: { lastRetryAt: new Date() },
      },
      opts
    );
  }

  async pushWebhookEvent(paymentId, event, payload, eventId = null) {
    return await Payment.findByIdAndUpdate(
      paymentId,
      {
        $push: {
          webhookEvents: {
            event,
            eventId,
            payload,
            receivedAt: new Date(),
          },
        },
      },
      { new: true }
    );
  }

  async recordWebhookEvent({ eventId, event, paymentId, payload, signatureValid }) {
    try {
      return await WebhookEvent.create({
        eventId,
        event,
        payment: paymentId || null,
        payload,
        signatureValid,
        processedAt: new Date(),
      });
    } catch (error) {
      if (error?.code === 11000) {
        return null; // duplicate — already processed
      }
      throw error;
    }
  }

  async findWebhookEvent(eventId) {
    return await WebhookEvent.findOne({ eventId });
  }

  async updateBookingPaymentStatus(bookingId, paymentStatus, session = null) {
    const opts = { new: true };
    if (session) opts.session = session;
    return await Booking.findByIdAndUpdate(
      bookingId,
      { paymentStatus },
      opts
    );
  }

  async findBookingForPayment(bookingId, customerId) {
    return await Booking.findOne({
      _id: bookingId,
      customer: customerId,
    });
  }

  async updateBookingAmount(bookingId, amount) {
    return await Booking.findByIdAndUpdate(
      bookingId,
      { amount },
      { new: true }
    );
  }

  async findBookingById(bookingId) {
    return await Booking.findById(bookingId);
  }

  async getAnalytics({ from, to } = {}) {
    const match = {};
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const [overview] = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          paidCount: {
            $sum: { $cond: [{ $eq: ["$status", PAYMENT_STATUS.PAID] }, 1, 0] },
          },
          paidAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", PAYMENT_STATUS.PAID] },
                "$amount",
                0,
              ],
            },
          },
          failedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", PAYMENT_STATUS.FAILED] }, 1, 0],
            },
          },
          failedAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", PAYMENT_STATUS.FAILED] },
                "$amount",
                0,
              ],
            },
          },
          refundedCount: {
            $sum: {
              $cond: [
                { $eq: ["$status", PAYMENT_STATUS.REFUNDED] },
                1,
                0,
              ],
            },
          },
          refundedAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", PAYMENT_STATUS.REFUNDED] },
                "$refundedAmount",
                0,
              ],
            },
          },
          pendingCount: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.CREATED],
                  ],
                },
                1,
                0,
              ],
            },
          },
          bookingPaymentAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$purpose", "booking"] },
                    { $eq: ["$status", PAYMENT_STATUS.PAID] },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
        },
      },
    ]);

    const byStatus = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const byMethod = await Payment.aggregate([
      {
        $match: {
          ...match,
          status: PAYMENT_STATUS.PAID,
          method: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$method",
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    const byPurpose = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$purpose",
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
          paidAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", PAYMENT_STATUS.PAID] },
                "$amount",
                0,
              ],
            },
          },
        },
      },
    ]);

    const daily = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
          paidAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", PAYMENT_STATUS.PAID] },
                "$amount",
                0,
              ],
            },
          },
          failedCount: {
            $sum: {
              $cond: [
                { $eq: ["$status", PAYMENT_STATUS.FAILED] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    const stats = overview || {
      totalPayments: 0,
      totalAmount: 0,
      paidCount: 0,
      paidAmount: 0,
      failedCount: 0,
      failedAmount: 0,
      refundedCount: 0,
      refundedAmount: 0,
      pendingCount: 0,
      walletRechargeAmount: 0,
      bookingPaymentAmount: 0,
    };

    const successRate =
      stats.totalPayments > 0
        ? Number(((stats.paidCount / stats.totalPayments) * 100).toFixed(2))
        : 0;

    return {
      overview: {
        ...stats,
        successRate,
        failureRate:
          stats.totalPayments > 0
            ? Number(
                ((stats.failedCount / stats.totalPayments) * 100).toFixed(2)
              )
            : 0,
      },
      byStatus: byStatus.map((s) => ({
        status: s._id,
        count: s.count,
        amount: s.amount,
      })),
      byMethod: byMethod.map((m) => ({
        method: m._id,
        count: m.count,
        amount: m.amount,
      })),
      byPurpose: byPurpose.map((p) => ({
        purpose: p._id,
        count: p.count,
        amount: p.amount,
        paidAmount: p.paidAmount,
      })),
      dailyTrend: daily.map((d) => ({
        date: d._id,
        count: d.count,
        paidAmount: d.paidAmount,
        failedCount: d.failedCount,
      })),
    };
  }

  async listForReportExport({ from, to, limit = 5000 } = {}) {
    const filter = {};

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    return await Payment.find(filter)
      .select("amount status purpose method customer createdAt razorpayOrderId")
      .populate("customer", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

export default new PaymentRepository();
