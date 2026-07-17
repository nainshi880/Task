import crypto from "crypto";
import walletRepository from "../repositories/wallet.repository.js";
import paymentRepository from "../repositories/payment.repository.js";
import { getRazorpay, getRazorpayConfig } from "../config/razorpay.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import PAYMENT_STATUS from "../constants/paymentStatus.js";
import PAGINATION from "../constants/pagination.js";
import withTransaction from "../utils/transaction.js";
import withRetry, { isTransientError } from "../utils/retry.js";
import {
  WALLET_TX_TYPE,
  WALLET_TX_CATEGORY,
  WALLET_TX_STATUS,
} from "../constants/walletTransaction.js";
import couponService from "./coupon.service.js";
import { writePaymentAudit, invalidatePaymentCache } from "../utils/paymentAudit.js";
import AUDIT_ACTION from "../constants/auditAction.js";
import notificationService from "./notification.service.js";
import pushService from "./push.service.js";
import emailService from "./email.service.js";
import smsService from "./sms.service.js";
import authRepository from "../repositories/auth.repository.js";

class WalletService {
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

  verifyCheckoutSignature(orderId, paymentId, signature) {
    const { keySecret } = getRazorpayConfig();
    const body = `${orderId}|${paymentId}`;
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");
    return expected === signature;
  }

  formatWallet(wallet) {
    return {
      walletId: wallet._id,
      customer: wallet.customer,
      balance: wallet.balance,
      currency: wallet.currency,
      isActive: wallet.isActive,
      totalCredited: wallet.totalCredited,
      totalDebited: wallet.totalDebited,
      lastTransactionAt: wallet.lastTransactionAt,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  // ======================================
  // Customer Wallet / Balance
  // ======================================

  async getWallet(customerId) {
    const wallet = await walletRepository.getOrCreate(customerId);
    return this.formatWallet(wallet);
  }

  async getBalance(customerId) {
    const wallet = await walletRepository.getOrCreate(customerId);
    return {
      walletId: wallet._id,
      balance: wallet.balance,
      currency: wallet.currency,
      isActive: wallet.isActive,
    };
  }

  // ======================================
  // Credit / Debit (internal)
  // ======================================

  async creditWallet({
    customerId,
    amount,
    category,
    description,
    bookingId = null,
    paymentId = null,
    referenceId = null,
    metadata = {},
    performedBy = null,
    session = null,
  }) {
    const wallet = await walletRepository.getOrCreate(customerId, session);

    if (!wallet.isActive) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Wallet is inactive.");
    }

    const creditAmount = Number(Number(amount).toFixed(2));

    const updated = await walletRepository.atomicCredit(
      wallet._id,
      creditAmount,
      session
    );

    if (!updated) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Unable to credit wallet. Wallet may be inactive."
      );
    }

    const tx = await walletRepository.createTransaction(
      {
        wallet: wallet._id,
        customer: customerId,
        type: WALLET_TX_TYPE.CREDIT,
        category,
        amount: creditAmount,
        balanceBefore: Number(
          (updated.balance - creditAmount).toFixed(2)
        ),
        balanceAfter: updated.balance,
        status: WALLET_TX_STATUS.COMPLETED,
        description,
        booking: bookingId,
        payment: paymentId,
        referenceId,
        metadata,
        performedBy,
      },
      session
    );

    return { wallet: updated, transaction: tx };
  }

  async debitWallet({
    customerId,
    amount,
    category,
    description,
    bookingId = null,
    paymentId = null,
    referenceId = null,
    metadata = {},
    performedBy = null,
    session = null,
  }) {
    const wallet = await walletRepository.getOrCreate(customerId, session);

    if (!wallet.isActive) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Wallet is inactive.");
    }

    const debitAmount = Number(Number(amount).toFixed(2));
    const balanceBefore = wallet.balance;

    if (balanceBefore < debitAmount) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Insufficient wallet balance. Available: ${balanceBefore}, required: ${debitAmount}.`
      );
    }

    const updated = await walletRepository.atomicDebit(
      wallet._id,
      debitAmount,
      session
    );

    if (!updated) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Insufficient wallet balance. Available: ${balanceBefore}, required: ${debitAmount}.`
      );
    }

    const tx = await walletRepository.createTransaction(
      {
        wallet: wallet._id,
        customer: customerId,
        type: WALLET_TX_TYPE.DEBIT,
        category,
        amount: debitAmount,
        balanceBefore: Number(
          (updated.balance + debitAmount).toFixed(2)
        ),
        balanceAfter: updated.balance,
        status: WALLET_TX_STATUS.COMPLETED,
        description,
        booking: bookingId,
        payment: paymentId,
        referenceId,
        metadata,
        performedBy,
      },
      session
    );

    return { wallet: updated, transaction: tx };
  }

  /**
   * Idempotent credit after successful Razorpay wallet recharge.
   * Called from wallet verify + payment webhook.
   */
  async creditRechargeFromPayment(payment) {
    if (!payment || payment.purpose !== "wallet_recharge") {
      return null;
    }

    const existing = await walletRepository.findTransactionByPayment(
      payment._id
    );
    if (existing) {
      return { alreadyCredited: true, transaction: existing };
    }

    const customerId = payment.customer._id || payment.customer;

    const result = await withTransaction(async (session) =>
      this.creditWallet({
        customerId,
        amount: payment.amount,
        category: WALLET_TX_CATEGORY.RECHARGE,
        description: `Wallet recharge via Razorpay (${payment.razorpayPaymentId || payment.razorpayOrderId})`,
        paymentId: payment._id,
        referenceId: payment.razorpayPaymentId || payment.razorpayOrderId,
        metadata: {
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: payment.razorpayPaymentId,
        },
        session,
      })
    );

    return { alreadyCredited: false, ...result };
  }

  // ======================================
  // Wallet Recharge (Razorpay)
  // ======================================

  async createRechargeOrder(customerId, { amount }) {
    const razorpay = this.ensureRazorpay();
    const { keyId } = getRazorpayConfig();
    const orderAmount = Number(amount);

    if (!orderAmount || orderAmount < 1) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Recharge amount must be at least 1."
      );
    }

    const wallet = await walletRepository.getOrCreate(customerId);

    if (!wallet.isActive) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Wallet is inactive.");
    }

    const amountInPaise = this.toPaise(orderAmount);
    const receipt = `wr_${wallet._id.toString().slice(-8)}_${Date.now()
      .toString()
      .slice(-6)}`;

    const razorpayOrder = await withRetry(
      async () =>
        razorpay.orders.create({
          amount: amountInPaise,
          currency: "INR",
          receipt,
          notes: {
            purpose: "wallet_recharge",
            walletId: wallet._id.toString(),
            customerId: customerId.toString(),
          },
        }),
      {
        retries: 2,
        delayMs: 400,
        shouldRetry: isTransientError,
      }
    );

    const payment = await paymentRepository.create({
      booking: null,
      purpose: "wallet_recharge",
      wallet: wallet._id,
      customer: customerId,
      amount: orderAmount,
      amountInPaise,
      currency: "INR",
      status: PAYMENT_STATUS.PENDING,
      razorpayOrderId: razorpayOrder.id,
      receipt,
      notes: {
        purpose: "wallet_recharge",
        walletId: wallet._id.toString(),
      },
    });

    return {
      paymentId: payment._id,
      walletId: wallet._id,
      amount: orderAmount,
      amountInPaise,
      currency: "INR",
      status: payment.status,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: keyId,
      receipt,
      purpose: "wallet_recharge",
    };
  }

  async verifyRecharge(customerId, payload) {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = payload;

    const payment = await paymentRepository.findByOrderId(razorpay_order_id);

    if (!payment) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Recharge order not found."
      );
    }

    const paymentCustomerId = payment.customer._id || payment.customer;
    if (paymentCustomerId.toString() !== customerId.toString()) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You cannot verify this recharge."
      );
    }

    if (payment.purpose !== "wallet_recharge") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "This order is not a wallet recharge."
      );
    }

    if (payment.status === PAYMENT_STATUS.PAID) {
      const credit = await this.creditRechargeFromPayment(payment);
      const wallet = await walletRepository.getOrCreate(customerId);
      return {
        alreadyPaid: true,
        payment,
        wallet: this.formatWallet(wallet),
        transaction: credit?.transaction || null,
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
        "Recharge verification failed. Invalid signature."
      );
    }

    let method = null;
    try {
      const razorpay = this.ensureRazorpay();
      const rpPayment = await razorpay.payments.fetch(razorpay_payment_id);
      method = rpPayment?.method || null;
    } catch {
      // non-blocking
    }

    const updated = await paymentRepository.markPaid(payment._id, {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      method,
    });

    const credit = await this.creditRechargeFromPayment(updated);
    const wallet = await walletRepository.getOrCreate(customerId);

    return {
      alreadyPaid: false,
      payment: updated,
      wallet: this.formatWallet(wallet),
      transaction: credit?.transaction || null,
    };
  }

  // ======================================
  // Wallet Payment (pay booking)
  // ======================================

  async payBooking(customerId, { bookingId, amount }) {
    const booking = await walletRepository.findBookingForWalletPay(
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

    const payAmount =
      amount !== undefined && amount !== null
        ? Number(amount)
        : Number(booking.amount);

    if (!payAmount || payAmount <= 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment amount must be greater than 0."
      );
    }

    const result = await withTransaction(async (session) => {
      const { wallet, transaction } = await this.debitWallet({
        customerId,
        amount: payAmount,
        category: WALLET_TX_CATEGORY.PAYMENT,
        description: `Wallet payment for booking ${booking.serviceName || bookingId}`,
        bookingId: booking._id,
        referenceId: `wallet_pay_${booking._id}_${Date.now()}`,
        metadata: { paymentMethod: "wallet" },
        performedBy: customerId,
        session,
      });

      const payment = await walletRepository.createPaymentRecord(
        {
          booking: booking._id,
          purpose: "booking",
          wallet: wallet._id,
          customer: customerId,
          amount: payAmount,
          amountInPaise: this.toPaise(payAmount),
          currency: "INR",
          status: PAYMENT_STATUS.PAID,
          method: "wallet",
          paidAt: new Date(),
          receipt: `wp_${booking._id.toString().slice(-8)}_${Date.now()
            .toString()
            .slice(-6)}`,
          notes: {
            paymentMethod: "wallet",
            walletTransactionId: transaction._id.toString(),
          },
        },
        session
      );

      await walletRepository.updateBookingPaymentStatus(
        booking._id,
        "Paid",
        session
      );

      return { wallet, transaction, payment };
    });

    try {
      await couponService.markRedeemedForBooking(booking._id);
    } catch {
      // non-blocking
    }

    await notificationService.notifyPayment(customerId, {
      title: "Booking paid with wallet",
      message: `₹${payAmount} was paid from your wallet for ${booking.serviceName || "your booking"}.`,
      paymentId: result.payment._id,
      bookingId: booking._id,
      metadata: { paymentMethod: "wallet" },
    });

    await pushService.notifyPaymentSuccess(customerId, {
      amount: payAmount,
      paymentId: result.payment._id,
      bookingId: booking._id,
    });

    try {
      const user = await authRepository.findById(customerId);
      if (user) {
        await Promise.allSettled([
          emailService.sendPaymentReceipt({
            user,
            payment: result.payment,
            booking,
          }),
          user.phone
            ? smsService.sendPaymentConfirmation({
                phone: user.phone,
                amount: payAmount,
                userId: user._id,
              })
            : Promise.resolve(),
        ]);
      }
    } catch {
      // non-blocking
    }

    return {
      bookingId: booking._id,
      amount: payAmount,
      paymentMethod: "wallet",
      bookingPaymentStatus: "Paid",
      wallet: this.formatWallet(result.wallet),
      transaction: result.transaction,
      paymentId: result.payment._id,
    };
  }

  // ======================================
  // Wallet Refund
  // ======================================

  async refundToWallet({
    bookingId,
    amount,
    reason,
    performedBy,
    customerId: explicitCustomerId = null,
  }) {
    const booking = await walletRepository.findBookingById(bookingId);

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    const customerId =
      explicitCustomerId ||
      booking.customer._id ||
      booking.customer;

    if (
      explicitCustomerId &&
      (booking.customer._id || booking.customer).toString() !==
        explicitCustomerId.toString()
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Booking does not belong to this customer."
      );
    }

    if (booking.paymentStatus === "Refunded") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Booking is already refunded."
      );
    }

    if (booking.paymentStatus !== "Paid") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only paid bookings can be refunded to wallet."
      );
    }

    const refundAmount =
      amount !== undefined && amount !== null
        ? Number(amount)
        : Number(booking.amount);

    if (!refundAmount || refundAmount <= 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Refund amount must be greater than 0."
      );
    }

    if (refundAmount > Number(booking.amount)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Refund amount cannot exceed booking amount."
      );
    }

    const result = await withTransaction(async (session) => {
      const { wallet, transaction } = await this.creditWallet({
        customerId,
        amount: refundAmount,
        category: WALLET_TX_CATEGORY.REFUND,
        description:
          reason ||
          `Refund for booking ${booking.serviceName || bookingId}`,
        bookingId: booking._id,
        referenceId: `wallet_refund_${booking._id}_${Date.now()}`,
        metadata: { reason: reason || null },
        performedBy,
        session,
      });

      await walletRepository.updateBookingPaymentStatus(
        booking._id,
        "Refunded",
        session
      );

      const paidPayment = await paymentRepository.findLatestPaidByBooking(
        booking._id
      );
      if (
        paidPayment &&
        (paidPayment.status === PAYMENT_STATUS.PAID ||
          paidPayment.status === PAYMENT_STATUS.REFUNDED)
      ) {
        const already = Number(paidPayment.refundedAmount || 0);
        const newTotal = Number((already + refundAmount).toFixed(2));
        await paymentRepository.markRefunded(
          paidPayment._id,
          {
            refundedAmount: Math.min(newTotal, paidPayment.amount),
            amount: refundAmount,
            reason: reason || "Wallet refund",
            method: "wallet",
            refundStatus: "processed",
          },
          session
        );
      }

      return {
        wallet,
        transaction,
        paymentId: paidPayment?._id || null,
      };
    });

    await writePaymentAudit({
      actorId: performedBy,
      action: AUDIT_ACTION.REFUND,
      resourceId: result.paymentId,
      description: "Booking refunded to wallet",
      metadata: { bookingId, refundAmount, reason },
    });

    if (result.paymentId) {
      await invalidatePaymentCache(result.paymentId, customerId);
    }

    return {
      bookingId: booking._id,
      refundAmount,
      bookingPaymentStatus: "Refunded",
      wallet: this.formatWallet(result.wallet),
      transaction: result.transaction,
    };
  }

  // ======================================
  // Transactions / History
  // ======================================

  async listTransactions(customerId, query = {}) {
    const page = Number(query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(
      Number(query.limit) || PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MAX_LIMIT
    );

    const { items, total } = await walletRepository.listTransactions(
      customerId,
      {
        page,
        limit,
        type: query.type,
        category: query.category,
        status: query.status,
        from: query.from,
        to: query.to,
      }
    );

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getHistory(customerId, query = {}) {
    const wallet = await walletRepository.getOrCreate(customerId);
    const summaryRows = await walletRepository.getHistorySummary(customerId);
    const transactions = await this.listTransactions(customerId, query);

    const byCategory = {};
    for (const row of summaryRows) {
      byCategory[row._id] = {
        count: row.count,
        totalAmount: row.totalAmount,
      };
    }

    return {
      wallet: this.formatWallet(wallet),
      summary: {
        totalCredited: wallet.totalCredited,
        totalDebited: wallet.totalDebited,
        currentBalance: wallet.balance,
        byCategory,
      },
      transactions: transactions.items,
      pagination: transactions.pagination,
    };
  }
}

export default new WalletService();
