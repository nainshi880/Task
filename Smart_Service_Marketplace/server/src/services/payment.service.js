import { getRazorpay, getRazorpayConfig } from "../config/razorpay.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import PAYMENT_STATUS from "../constants/paymentStatus.js";
import PAGINATION from "../constants/pagination.js";
import AUDIT_ACTION from "../constants/auditAction.js";
import withRetry, { isTransientError } from "../utils/retry.js";
import withTransaction from "../utils/transaction.js";
import cacheService, { CACHE_KEYS, CACHE_TTL } from "../utils/cache.js";
import {
  writePaymentAudit,
  invalidatePaymentCache,
} from "../utils/paymentAudit.js";
import { stableQueryKey } from "../utils/pagination.js";
import auditRepository from "../repositories/audit.repository.js";
import env from "../config/env.js";
import logger from "../utils/logger.js";
import notificationService from "./notification.service.js";
import emailService from "./email.service.js";
import authRepository from "../repositories/auth.repository.js";
import crypto from "crypto";
import paymentRepository from "../repositories/payment.repository.js";

const MAX_PAYMENT_RETRIES = 5;

class PaymentService {
  ensureRazorpay() {
    const instance = getRazorpay();
    if (!instance) {
      throw new ApiError(
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
      );
    }
    return instance;
  }

  toPaise(amountInRupees) {
    return Math.round(Number(amountInRupees) * 100);
  }

  fromPaise(amountInPaise) {
    return Number((Number(amountInPaise) / 100).toFixed(2));
  }

  verifyCheckoutSignature(orderId, paymentId, signature) {
    const { keySecret } = getRazorpayConfig();
    const body = `${orderId}|${paymentId}`;
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    return expected === signature;
  }

  verifyWebhookSignature(rawBody, signature) {
    const { webhookSecret } = getRazorpayConfig();

    if (!webhookSecret) {
      if (env.NODE_ENV === "production") {
        logger.error("RAZORPAY_WEBHOOK_SECRET missing in production.");
        return false;
      }
      logger.warn("RAZORPAY_WEBHOOK_SECRET not set — skipping webhook verify.");
      return true;
    }

    if (!signature) return false;

    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(String(signature))
      );
    } catch {
      return expected === signature;
    }
  }

  // ======================================
  // Create Payment Order
  // ======================================

  async createOrder(customerId, { bookingId, amount }, meta = {}) {
    const razorpay = this.ensureRazorpay();
    const { keyId } = getRazorpayConfig();

    const booking = await paymentRepository.findBookingForPayment(
      bookingId,
      customerId
    );

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    if (booking.paymentStatus === "Paid") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Booking is already paid."
      );
    }

    const orderAmount =
      amount !== undefined && amount !== null
        ? Number(amount)
        : Number(booking.amount);

    if (!orderAmount || orderAmount <= 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment amount must be greater than 0. Set booking amount first."
      );
    }

    const amountInPaise = this.toPaise(orderAmount);
    const receipt = `bk_${booking._id.toString().slice(-8)}_${Date.now()
      .toString()
      .slice(-6)}`;

    const razorpayOrder = await withRetry(
      async () =>
        razorpay.orders.create({
          amount: amountInPaise,
          currency: "INR",
          receipt,
          notes: {
            bookingId: booking._id.toString(),
            customerId: customerId.toString(),
            serviceName: booking.serviceName,
            purpose: "booking",
          },
        }),
      {
        retries: 2,
        delayMs: 400,
        shouldRetry: isTransientError,
      }
    );

    const payment = await paymentRepository.create({
      booking: booking._id,
      purpose: "booking",
      customer: customerId,
      amount: orderAmount,
      amountInPaise,
      currency: "INR",
      status: PAYMENT_STATUS.PENDING,
      razorpayOrderId: razorpayOrder.id,
      receipt,
      notes: {
        bookingId: booking._id.toString(),
        serviceName: booking.serviceName,
        purpose: "booking",
      },
    });

    if (booking.amount !== orderAmount) {
      await paymentRepository.updateBookingAmount(
        booking._id,
        orderAmount
      );
    }

    await writePaymentAudit({
      actorId: customerId,
      action: AUDIT_ACTION.PAY,
      resourceId: payment._id,
      description: "Payment order created",
      metadata: {
        bookingId: booking._id,
        amount: orderAmount,
        razorpayOrderId: razorpayOrder.id,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await invalidatePaymentCache(payment._id, customerId);

    return {
      paymentId: payment._id,
      bookingId: booking._id,
      amount: orderAmount,
      amountInPaise,
      currency: "INR",
      status: payment.status,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: keyId,
      receipt,
    };
  }

  // ======================================
  // Verify Payment (transactional)
  // ======================================

  async verifyPayment(customerId, payload, meta = {}) {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = payload;

    const payment = await paymentRepository.findByOrderId(
      razorpay_order_id
    );

    if (!payment) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payment order not found.");
    }

    if (payment.purpose === "wallet_recharge") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Wallet recharge payments are no longer supported."
      );
    }

    if (payment.customer._id.toString() !== customerId.toString()) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You cannot verify this payment."
      );
    }

    if (payment.status === PAYMENT_STATUS.PAID) {
      return {
        alreadyPaid: true,
        payment,
      };
    }

    const isValid = this.verifyCheckoutSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      await paymentRepository.markFailed(payment._id, {
        failureReason: "Invalid payment signature",
        failureCode: "SIGNATURE_MISMATCH",
        razorpayPaymentId: razorpay_payment_id,
      });

      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment verification failed. Invalid signature."
      );
    }

    let method = null;
    try {
      const razorpay = this.ensureRazorpay();
      const rpPayment = await withRetry(
        () => razorpay.payments.fetch(razorpay_payment_id),
        { retries: 2, delayMs: 300, shouldRetry: isTransientError }
      );
      method = rpPayment?.method || null;
    } catch {
      // non-blocking
    }

    const updated = await withTransaction(async (session) => {
      const paid = await paymentRepository.markPaid(
        payment._id,
        {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          method,
        },
        session
      );

      const bookingId = payment.booking?._id || payment.booking;
      if (bookingId) {
        await paymentRepository.updateBookingPaymentStatus(
          bookingId,
          "Paid",
          session
        );
      }

      return paid;
    });

    const bookingId = payment.booking?._id || payment.booking;

    await writePaymentAudit({
      actorId: customerId,
      action: AUDIT_ACTION.PAY,
      resourceId: payment._id,
      description: "Payment verified successfully",
      metadata: {
        bookingId,
        razorpayPaymentId: razorpay_payment_id,
        method,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await notificationService.notifyPayment(customerId, {
      title: "Payment successful",
      message: `Your payment of ₹${payment.amount} was successful.`,
      paymentId: payment._id,
      bookingId,
      metadata: { method, status: "Paid" },
    });

    // Email receipt (non-blocking)
    try {
      const user = await authRepository.findById(customerId);
      if (user) {
        const bookingDoc = bookingId
          ? await paymentRepository.findBookingById(bookingId)
          : null;
        await emailService.sendPaymentReceipt({
          user,
          payment: updated || payment,
          booking: bookingDoc,
        });
      }
    } catch {
      // non-blocking
    }

    await invalidatePaymentCache(payment._id, customerId);

    return {
      alreadyPaid: false,
      payment: updated,
      bookingPaymentStatus: "Paid",
    };
  }

  // ======================================
  // Payment Status / Lists
  // ======================================

  async getPaymentStatus(customerId, paymentId) {
    const cacheKey = `${CACHE_KEYS.PAYMENT_STATUS_PREFIX}${paymentId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return { ...cached, cached: true };

    const payment = await paymentRepository.findById(paymentId);

    if (!payment) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payment not found.");
    }

    if (payment.purpose === "wallet_recharge") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Wallet recharge payments are no longer supported."
      );
    }

    if (payment.customer._id.toString() !== customerId.toString()) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Access denied.");
    }

    const status = {
      paymentId: payment._id,
      bookingId: payment.booking?._id || payment.booking,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      method: payment.method,
      paidAt: payment.paidAt,
      failedAt: payment.failedAt,
      failureReason: payment.failureReason,
      refundedAmount: payment.refundedAmount,
      retryCount: payment.retryCount,
      booking: payment.booking,
      cached: false,
    };

    await cacheService.set(cacheKey, status, CACHE_TTL.DETAIL);
    return status;
  }

  async getPaymentByBooking(customerId, bookingId) {
    const booking = await paymentRepository.findBookingForPayment(
      bookingId,
      customerId
    );

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    const payments = await paymentRepository.findByBooking(bookingId);
    const latest = payments[0] || null;

    return {
      bookingId,
      bookingPaymentStatus: booking.paymentStatus,
      latestPayment: latest,
      payments,
    };
  }

  async listMyPayments(customerId, query = {}) {
    let page = parseInt(query.page, 10);
    let limit = parseInt(query.limit, 10);

    if (Number.isNaN(page) || page < 1) page = PAGINATION.DEFAULT_PAGE;
    if (Number.isNaN(limit) || limit < PAGINATION.MIN_LIMIT) {
      limit = PAGINATION.DEFAULT_LIMIT;
    }
    if (limit > PAGINATION.MAX_LIMIT) limit = PAGINATION.MAX_LIMIT;

    const cacheKey = `${CACHE_KEYS.PAYMENT_LIST_PREFIX}${customerId}:${page}:${limit}:${query.status || "all"}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return { ...cached, cached: true };

    const { items, total } = await paymentRepository.findByCustomer(
      customerId,
      {
        page,
        limit,
        status: query.status,
      }
    );

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const result = {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      cached: false,
    };

    await cacheService.set(cacheKey, result, CACHE_TTL.LIST);
    return result;
  }

  async listAdminPayments(query = {}) {
    const cacheKey = `${CACHE_KEYS.PAYMENT_ADMIN_LIST_PREFIX}${stableQueryKey(query)}`;

    const { value, cached } = await cacheService.getOrSet(
      cacheKey,
      CACHE_TTL.LIST,
      async () => {
        let page = parseInt(query.page, 10);
        let limit = parseInt(query.limit, 10);

        if (Number.isNaN(page) || page < 1) page = PAGINATION.DEFAULT_PAGE;
        if (Number.isNaN(limit) || limit < PAGINATION.MIN_LIMIT) {
          limit = PAGINATION.DEFAULT_LIMIT;
        }
        if (limit > PAGINATION.MAX_LIMIT) limit = PAGINATION.MAX_LIMIT;

        const { items, total } = await paymentRepository.listAdmin({
          page,
          limit,
          status: query.status,
          purpose: query.purpose,
          customerId: query.customerId,
          from: query.from,
          to: query.to,
          search: query.q || query.search,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
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
    );

    return { ...value, cached };
  }

  // ======================================
  // Payment Failure
  // ======================================

  async markPaymentFailed(customerId, payload, meta = {}) {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      failureReason,
      failureCode,
      error,
    } = payload;

    const payment = await paymentRepository.findByOrderId(
      razorpay_order_id
    );

    if (!payment) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payment order not found.");
    }

    if (payment.customer._id.toString() !== customerId.toString()) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Access denied.");
    }

    if (payment.status === PAYMENT_STATUS.PAID) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Cannot mark a successful payment as failed."
      );
    }

    const updated = await paymentRepository.markFailed(payment._id, {
      failureReason:
        failureReason ||
        error?.description ||
        error?.reason ||
        "Payment failed on client",
      failureCode: failureCode || error?.code || "CLIENT_FAILURE",
      razorpayPaymentId: razorpay_payment_id || null,
    });

    await writePaymentAudit({
      actorId: customerId,
      action: AUDIT_ACTION.FAIL,
      resourceId: payment._id,
      description: "Payment marked as failed",
      metadata: {
        failureReason: updated.failureReason,
        failureCode: updated.failureCode,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await notificationService.notifyPayment(customerId, {
      title: "Payment failed",
      message:
        updated.failureReason ||
        "Your payment could not be completed. Please try again.",
      paymentId: payment._id,
      bookingId: payment.booking?._id || payment.booking,
      metadata: {
        failureCode: updated.failureCode,
        status: "Failed",
      },
    });

    await invalidatePaymentCache(payment._id, customerId);
    return updated;
  }

  // ======================================
  // Payment Retry
  // ======================================

  async retryPayment(customerId, paymentId, meta = {}) {
    const payment = await paymentRepository.findById(paymentId);

    if (!payment) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payment not found.");
    }

    if (payment.customer._id.toString() !== customerId.toString()) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Access denied.");
    }

    if (payment.status === PAYMENT_STATUS.PAID) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment is already successful."
      );
    }

    if (payment.status === PAYMENT_STATUS.REFUNDED) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Cannot retry a refunded payment."
      );
    }

    if ((payment.retryCount || 0) >= MAX_PAYMENT_RETRIES) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Maximum retry attempts (${MAX_PAYMENT_RETRIES}) reached.`
      );
    }

    const bookingId = payment.booking?._id || payment.booking;
    if (!bookingId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only booking payments can be retried."
      );
    }

    await paymentRepository.incrementRetry(payment._id);

    const order = await this.createOrder(
      customerId,
      {
        bookingId: bookingId.toString(),
        amount: payment.amount,
      },
      meta
    );

    await writePaymentAudit({
      actorId: customerId,
      action: AUDIT_ACTION.RETRY,
      resourceId: payment._id,
      description: "Payment retry initiated",
      metadata: {
        previousPaymentId: payment._id,
        newPaymentId: order.paymentId,
        retryCount: (payment.retryCount || 0) + 1,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      retriedFrom: payment._id,
      retryCount: (payment.retryCount || 0) + 1,
      ...order,
    };
  }

  // ======================================
  // Failed Payment Recovery
  // ======================================

  async recoverPayment(adminId, paymentId, meta = {}) {
    const payment = await paymentRepository.findById(paymentId);

    if (!payment) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payment not found.");
    }

    if (payment.purpose === "wallet_recharge") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Wallet recharge payments are no longer supported."
      );
    }

    if (!payment.razorpayOrderId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment has no Razorpay order to recover."
      );
    }

    if (payment.status === PAYMENT_STATUS.PAID) {
      return { alreadyPaid: true, payment, recovered: false };
    }

    const razorpay = this.ensureRazorpay();

    const payments = await withRetry(
      () => razorpay.orders.fetchPayments(payment.razorpayOrderId),
      { retries: 2, delayMs: 400, shouldRetry: isTransientError }
    );

    const captured = (payments?.items || []).find(
      (p) => p.status === "captured" || p.status === "authorized"
    );

    if (!captured) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "No successful Razorpay payment found for this order. Cannot recover."
      );
    }

    const updated = await withTransaction(async (session) => {
      const paid = await paymentRepository.markPaid(
        payment._id,
        {
          razorpayPaymentId: captured.id,
          razorpaySignature: payment.razorpaySignature || "recovered",
          method: captured.method || null,
        },
        session
      );

      const bookingId = payment.booking?._id || payment.booking;
      if (bookingId) {
        await paymentRepository.updateBookingPaymentStatus(
          bookingId,
          "Paid",
          session
        );
      }

      return paid;
    });

    await writePaymentAudit({
      actorId: adminId,
      action: AUDIT_ACTION.RECOVER,
      resourceId: payment._id,
      description: "Failed/pending payment recovered from Razorpay",
      metadata: {
        razorpayPaymentId: captured.id,
        previousStatus: payment.status,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await invalidatePaymentCache(
      payment._id,
      payment.customer?._id || payment.customer
    );

    return {
      alreadyPaid: false,
      recovered: true,
      payment: updated,
      razorpayPaymentId: captured.id,
    };
  }

  async listRecoverablePayments(query = {}) {
    const olderThanMinutes = Number(query.olderThanMinutes) || 15;
    const limit = Math.min(Number(query.limit) || 50, 100);
    const items = await paymentRepository.findFailedForRecovery({
      olderThanMinutes,
      limit,
    });
    return { items, count: items.length, olderThanMinutes };
  }

  // ======================================
  // Refund Processing
  // ======================================

  async processRefund(actor, { paymentId, amount, reason, method }, meta = {}) {
    const payment = await paymentRepository.findById(paymentId);

    if (!payment) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payment not found.");
    }

    if (payment.status !== PAYMENT_STATUS.PAID && payment.status !== PAYMENT_STATUS.REFUNDED) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only paid payments can be refunded."
      );
    }

    const alreadyRefunded = Number(payment.refundedAmount || 0);
    const refundable = Number(
      (payment.amount - alreadyRefunded).toFixed(2)
    );

    if (refundable <= 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment is already fully refunded."
      );
    }

    const refundAmount =
      amount !== undefined && amount !== null
        ? Number(amount)
        : refundable;

    if (!refundAmount || refundAmount <= 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Refund amount must be greater than 0."
      );
    }

    if (refundAmount > refundable) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Refund amount cannot exceed remaining refundable amount (₹${refundable}).`
      );
    }

    if (payment.method === "wallet" || method === "wallet") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Wallet refunds are no longer supported."
      );
    }

    const refundMethod = "razorpay";
    let razorpayRefundId = null;

    if (!payment.razorpayPaymentId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "No Razorpay payment ID available for this refund."
      );
    }

    const razorpay = this.ensureRazorpay();
    const rpRefund = await withRetry(
      () =>
        razorpay.payments.refund(payment.razorpayPaymentId, {
          amount: this.toPaise(refundAmount),
          notes: {
            reason: reason || "Admin refund",
            paymentId: payment._id.toString(),
          },
        }),
      { retries: 2, delayMs: 400, shouldRetry: isTransientError }
    );
    razorpayRefundId = rpRefund?.id || null;

    const newRefundedTotal = Number(
      (alreadyRefunded + refundAmount).toFixed(2)
    );

    const updated = await withTransaction(async (session) => {
      const marked = await paymentRepository.markRefunded(
        payment._id,
        {
          refundedAmount: newRefundedTotal,
          amount: refundAmount,
          razorpayRefundId,
          reason,
          method: refundMethod,
          refundStatus: "processed",
        },
        session
      );

      const bookingId = payment.booking?._id || payment.booking;
      if (bookingId && newRefundedTotal >= payment.amount) {
        await paymentRepository.updateBookingPaymentStatus(
          bookingId,
          "Refunded",
          session
        );
      }

      return marked;
    });

    await writePaymentAudit({
      actorId: actor._id,
      action: AUDIT_ACTION.REFUND,
      resourceId: payment._id,
      description: `Refund processed via ${refundMethod}`,
      metadata: {
        refundAmount,
        razorpayRefundId,
        method: refundMethod,
        reason,
        totalRefunded: newRefundedTotal,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await notificationService.notifyPayment(
      payment.customer?._id || payment.customer,
      {
        title: "Refund processed",
        message: `A refund of ₹${refundAmount} has been processed for your payment.`,
        paymentId: payment._id,
        bookingId: payment.booking?._id || payment.booking,
        metadata: {
          refundAmount,
          method: refundMethod,
          totalRefunded: newRefundedTotal,
        },
      }
    );

    await invalidatePaymentCache(
      payment._id,
      payment.customer?._id || payment.customer
    );

    return {
      payment: updated,
      refundAmount,
      razorpayRefundId,
      method: refundMethod,
      totalRefunded: newRefundedTotal,
      fullyRefunded: newRefundedTotal >= payment.amount,
    };
  }

  // ======================================
  // Payment Analytics
  // ======================================

  async getAnalytics(query = {}) {
    const cacheKey = `${CACHE_KEYS.PAYMENT_ANALYTICS}:${query.from || "all"}:${query.to || "all"}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return { ...cached, cached: true };

    const analytics = await paymentRepository.getAnalytics({
      from: query.from,
      to: query.to,
    });

    const result = { ...analytics, cached: false };
    await cacheService.set(cacheKey, result, CACHE_TTL.ANALYTICS);
    return result;
  }

  // ======================================
  // Audit Logs
  // ======================================

  async getPaymentAuditLogs(paymentId, query = {}) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Payment not found.");
    }

    const page = Number(query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(
      Number(query.limit) || 20,
      PAGINATION.MAX_LIMIT
    );

    const { logs, total } = await auditRepository.findByResource(
      "Payment",
      paymentId,
      { page, limit }
    );

    return {
      paymentId,
      items: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // ======================================
  // Webhooks (secured + idempotent)
  // ======================================

  async handleWebhook(rawBody, signature, eventIdHeader = null) {
    const isValid = this.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      await writePaymentAudit({
        actorId: null,
        action: AUDIT_ACTION.WEBHOOK,
        description: "Rejected webhook — invalid signature",
        metadata: { signaturePresent: Boolean(signature) },
      });
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid Razorpay webhook signature."
      );
    }

    let event;
    try {
      event =
        typeof rawBody === "string" || Buffer.isBuffer(rawBody)
          ? JSON.parse(rawBody.toString())
          : rawBody;
    } catch {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid webhook payload."
      );
    }

    const eventName = event.event;
    const eventId = eventIdHeader || event.id || null;

    if (eventId) {
      const existing = await paymentRepository.findWebhookEvent(eventId);
      if (existing) {
        return {
          handled: true,
          duplicate: true,
          event: eventName,
          eventId,
        };
      }
    }

    logger.info(`Razorpay webhook received: ${eventName}`);

    const entity =
      event.payload?.payment?.entity ||
      event.payload?.order?.entity ||
      event.payload?.refund?.entity ||
      null;

    if (!entity) {
      if (eventId) {
        await paymentRepository.recordWebhookEvent({
          eventId,
          event: eventName,
          paymentId: null,
          payload: event,
          signatureValid: true,
        });
      }
      return { handled: false, event: eventName, reason: "No entity" };
    }

    let payment = null;

    if (entity.order_id) {
      payment = await paymentRepository.findByOrderId(entity.order_id);
    }

    if (!payment && entity.payment_id) {
      payment = await paymentRepository.findByPaymentId(entity.payment_id);
    }

    if (!payment && entity.id?.startsWith("order_")) {
      payment = await paymentRepository.findByOrderId(entity.id);
    }

    if (!payment && entity.id?.startsWith("pay_")) {
      payment = await paymentRepository.findByPaymentId(entity.id);
    }

    if (eventId) {
      const recorded = await paymentRepository.recordWebhookEvent({
        eventId,
        event: eventName,
        paymentId: payment?._id || null,
        payload: event,
        signatureValid: true,
      });
      if (!recorded) {
        return {
          handled: true,
          duplicate: true,
          event: eventName,
          eventId,
        };
      }
    }

    if (!payment) {
      logger.warn(
        `Payment not found for webhook: ${entity.order_id || entity.id}`
      );
      return {
        handled: false,
        event: eventName,
        reason: "Payment record not found",
      };
    }

    if (payment.purpose === "wallet_recharge") {
      logger.warn(`Ignoring retired wallet recharge payment ${payment._id}`);
      return {
        handled: false,
        event: eventName,
        reason: "wallet_recharge_unsupported",
        eventId,
      };
    }

    await paymentRepository.pushWebhookEvent(
      payment._id,
      eventName,
      event,
      eventId
    );

    switch (eventName) {
      case "payment.captured":
      case "order.paid": {
        if (payment.status !== PAYMENT_STATUS.PAID) {
          const updated = await withTransaction(async (session) => {
            const paid = await paymentRepository.markPaid(
              payment._id,
              {
                razorpayPaymentId: entity.id?.startsWith("pay_")
                  ? entity.id
                  : entity.payment_id || payment.razorpayPaymentId,
                razorpaySignature: payment.razorpaySignature || "webhook",
                method: entity.method || null,
              },
              session
            );

            const bookingId = payment.booking?._id || payment.booking;
            if (bookingId) {
              await paymentRepository.updateBookingPaymentStatus(
                bookingId,
                "Paid",
                session
              );
            }

            return paid;
          });

          await writePaymentAudit({
            actorId: null,
            action: AUDIT_ACTION.WEBHOOK,
            resourceId: payment._id,
            description: `Webhook ${eventName} — marked paid`,
            metadata: { eventId, eventName },
          });

          await invalidatePaymentCache(
            payment._id,
            payment.customer?._id || payment.customer
          );
        }
        return { handled: true, event: eventName, status: "Paid", eventId };
      }

      case "payment.failed": {
        if (payment.status !== PAYMENT_STATUS.PAID) {
          await paymentRepository.markFailed(payment._id, {
            failureReason:
              entity.error_description ||
              entity.error_reason ||
              "Payment failed via webhook",
            failureCode: entity.error_code || "WEBHOOK_FAILURE",
            razorpayPaymentId: entity.id || null,
          });

          await writePaymentAudit({
            actorId: null,
            action: AUDIT_ACTION.FAIL,
            resourceId: payment._id,
            description: "Webhook payment.failed",
            metadata: { eventId },
          });

          await invalidatePaymentCache(
            payment._id,
            payment.customer?._id || payment.customer
          );
        }
        return { handled: true, event: eventName, status: "Failed", eventId };
      }

      case "refund.processed":
      case "refund.created": {
        const refundAmount = this.fromPaise(entity.amount || 0);
        if (refundAmount > 0 && payment.status !== PAYMENT_STATUS.REFUNDED) {
          const newTotal = Number(
            (
              Number(payment.refundedAmount || 0) + refundAmount
            ).toFixed(2)
          );

          await withTransaction(async (session) => {
            await paymentRepository.markRefunded(
              payment._id,
              {
                refundedAmount: Math.min(newTotal, payment.amount),
                amount: refundAmount,
                razorpayRefundId: entity.id,
                reason: "Razorpay refund webhook",
                method: "razorpay",
                refundStatus:
                  eventName === "refund.processed" ? "processed" : "pending",
              },
              session
            );

            const bookingId = payment.booking?._id || payment.booking;
            if (bookingId && newTotal >= payment.amount) {
              await paymentRepository.updateBookingPaymentStatus(
                bookingId,
                "Refunded",
                session
              );
            }
          });

          await writePaymentAudit({
            actorId: null,
            action: AUDIT_ACTION.REFUND,
            resourceId: payment._id,
            description: `Webhook ${eventName}`,
            metadata: { eventId, refundAmount },
          });

          await invalidatePaymentCache(
            payment._id,
            payment.customer?._id || payment.customer
          );
        }
        return {
          handled: true,
          event: eventName,
          status: "Refunded",
          eventId,
        };
      }

      default:
        return {
          handled: true,
          event: eventName,
          status: payment.status,
          eventId,
        };
    }
  }
}

export default new PaymentService();
