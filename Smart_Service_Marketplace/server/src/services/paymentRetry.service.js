import { getRazorpay, getRazorpayConfig } from "../config/razorpay.js";
import env from "../config/env.js";
import logger from "../utils/logger.js";
import PAYMENT_STATUS from "../constants/paymentStatus.js";
import {
  PAYMENT_AUTO_RETRY,
  PAYMENT_AUTO_RETRY_STATUS,
  buildRetryIdempotencyKey,
  getAutoRetryDelayMs,
  getRetryDayKey,
} from "../constants/paymentRetry.js";
import { enqueuePaymentRetryJob } from "../queues/paymentRetry.queue.js";
import paymentRepository from "../repositories/payment.repository.js";
import razorpayRateLimiter from "../utils/razorpayRateLimiter.js";
import withRetry, { isTransientError } from "../utils/retry.js";
import { withDistributedLock } from "../utils/distributedLock.js";
import { claimIdempotencyKey } from "../utils/idempotency.js";
import metricsStore from "../utils/metrics.js";
import {
  writePaymentAudit,
  invalidatePaymentCache,
} from "../utils/paymentAudit.js";
import AUDIT_ACTION from "../constants/auditAction.js";
import emailService from "./email.service.js";
import notificationService from "./notification.service.js";
import assignmentService from "./assignment.service.js";
import {
  queueInAppNotification,
  queueEmailJob,
  queuePushNotification,
} from "./notificationQueue.service.js";
import NOTIFICATION_TYPES from "../constants/notificationType.js";

class PaymentRetryService {
  isEnabled() {
    return env.PAYMENT_RETRY_ENABLED !== false;
  }

  /**
   * Called immediately from payment.failed webhook (and optionally client failure).
   * Queues attempt #1, emails the customer once, and tracks auto-retry state.
   */
  async enqueueFromFailure(payment, meta = {}) {
    if (!this.isEnabled()) {
      return { queued: false, reason: "disabled" };
    }

    if (!payment?._id) {
      return { queued: false, reason: "missing_payment" };
    }

    if (
      payment.status === PAYMENT_STATUS.PAID ||
      payment.status === PAYMENT_STATUS.REFUNDED
    ) {
      return { queued: false, reason: "terminal_status" };
    }

    // Subscription charges are handled by Razorpay recurring; skip booking auto-retry only
    if (payment.purpose === "subscription") {
      return { queued: false, reason: "subscription_skip" };
    }

    const dayKey = getRetryDayKey();
    const existingDay = payment.autoRetry?.dayKey;
    let attemptCount = payment.autoRetry?.attemptCount || 0;
    const resetAttempts = Boolean(existingDay && existingDay !== dayKey);

    // New calendar day → reset attempt window
    if (resetAttempts) {
      attemptCount = 0;
    }

    if (attemptCount >= PAYMENT_AUTO_RETRY.MAX_ATTEMPTS) {
      await paymentRepository.markAutoRetryFailedAttempt(payment._id, {
        lastError: "Same-day auto-retry limit already reached.",
        status: PAYMENT_AUTO_RETRY_STATUS.EXHAUSTED,
      });
      return { queued: false, reason: "day_limit_reached" };
    }

    const nextAttempt = attemptCount + 1;
    const idempotencyKey = buildRetryIdempotencyKey(
      payment._id,
      dayKey,
      nextAttempt
    );

    if (
      !resetAttempts &&
      payment.autoRetry?.processedKeys?.includes(idempotencyKey)
    ) {
      return { queued: false, reason: "already_processed" };
    }

    const delayMs = getAutoRetryDelayMs(nextAttempt);
    const nextRetryAt = new Date(Date.now() + delayMs);

    await paymentRepository.markAutoRetryQueued(payment._id, {
      dayKey,
      nextRetryAt,
      maxAttempts: PAYMENT_AUTO_RETRY.MAX_ATTEMPTS,
      resetAttempts,
    });

    // Email + in-app notify once per failure wave (offloaded to notification queue)
    // Fire-and-forget so webhook/API returns quickly under load.
    // Load tests can pass skipNotify: true to avoid SMTP/FCM storms.
    if (!meta.skipNotify) {
      this.notifyCustomerFailure(payment, meta).catch((error) => {
        logger.warn(`Payment failure notify failed: ${error.message}`);
      });
    }

    const enqueueResult = await enqueuePaymentRetryJob({
      paymentId: payment._id,
      attempt: nextAttempt,
      dayKey,
      idempotencyKey,
      reason: meta.reason || payment.failureReason || "payment.failed",
      trigger: meta.trigger || "webhook",
    });

    return {
      ...enqueueResult,
      attempt: nextAttempt,
      dayKey,
      idempotencyKey,
      nextRetryAt,
    };
  }

  async notifyCustomerFailure(payment, meta = {}) {
    const marked = await paymentRepository.markFailureEmailSent(payment._id);
    if (!marked) {
      return { emailed: false, reason: "already_sent" };
    }

    const fresh =
      (await paymentRepository.findByIdLean(payment._id)) || payment;
    const customer = fresh.customer;
    const customerId = customer?._id || customer;
    const booking = fresh.booking;

    if (customerId && meta.trigger !== "client_failure") {
      await queueInAppNotification({
        userId: customerId,
        title: "Payment failed — we will retry",
        message:
          fresh.failureReason ||
          "Your payment could not be completed. We will automatically retry up to 3 times today.",
        type: NOTIFICATION_TYPES.PAYMENT,
        paymentId: fresh._id,
        bookingId: booking?._id || booking,
        metadata: {
          failureCode: fresh.failureCode,
          autoRetry: true,
          trigger: meta.trigger || "webhook",
        },
      });

      await queuePushNotification({
        userId: customerId,
        title: "Payment failed — we will retry",
        body:
          fresh.failureReason ||
          "We will automatically retry your payment up to 3 times today.",
        data: {
          type: "payment.failed",
          paymentId: String(fresh._id),
          bookingId: String(booking?._id || booking || ""),
          actionUrl: booking?._id
            ? `/bookings/${booking._id}`
            : "/bookings",
        },
      });
    }

    if (customer?.email) {
      await queueEmailJob({
        method: "sendPaymentFailed",
        userId: customer._id || customerId,
        payload: {
          user: customer,
          payment: fresh,
          booking,
          maxAttempts: PAYMENT_AUTO_RETRY.MAX_ATTEMPTS,
        },
      });
    }

    return { emailed: true };
  }

  /**
   * BullMQ worker entry — distributed lock + Redis/Mongo idempotency + circuit-protected Razorpay.
   * Always resolves or throws a clean Error (never leaves hanging awaits).
   */
  async processRetryJob(job) {
    const {
      paymentId,
      attempt,
      dayKey,
      idempotencyKey,
      reason = "",
    } = job.data || {};

    if (!paymentId || !attempt || !dayKey || !idempotencyKey) {
      throw new Error("Invalid payment retry job payload.");
    }

    try {
      return await withDistributedLock(
        `payment-retry:${paymentId}`,
        async () => {
          try {
            const today = getRetryDayKey();
            if (dayKey !== today) {
              logger.info("Skipping payment retry — different calendar day", {
                paymentId,
                dayKey,
                today,
              });
              return { skipped: true, reason: "different_day" };
            }

            let redisClaim;
            try {
              redisClaim = await claimIdempotencyKey(idempotencyKey, {
                ttlSeconds: 60 * 60 * 48,
                payload: JSON.stringify({
                  jobId: String(job.id),
                  at: new Date().toISOString(),
                }),
              });
            } catch (error) {
              logger.warn("Redis idempotency claim failed", {
                paymentId,
                message: error.message,
              });
              // Fail open — Mongo claim remains the source of truth
              redisClaim = { ok: true, first: true, backend: "error_passthrough" };
            }

            if (!redisClaim.ok) {
              metricsStore.recordIdempotency("duplicate");
              logger.info("Payment retry Redis idempotency skip", {
                paymentId,
                attempt,
                idempotencyKey,
              });
              return { skipped: true, reason: "redis_idempotent" };
            }
            metricsStore.recordIdempotency("claimed");

            let claimed;
            try {
              claimed = await paymentRepository.claimAutoRetryAttempt(
                paymentId,
                {
                  dayKey,
                  attempt,
                  idempotencyKey,
                  jobId: String(job.id),
                }
              );
            } catch (error) {
              logger.error("Mongo claimAutoRetryAttempt failed", {
                paymentId,
                message: error.message,
              });
              throw new Error(
                `Mongo claim failed for payment ${paymentId}: ${error.message}`
              );
            }

            if (!claimed) {
              try {
                const current =
                  await paymentRepository.findByIdLean(paymentId);
                if (current?.status === PAYMENT_STATUS.PAID) {
                  return { skipped: true, reason: "already_paid" };
                }
              } catch (error) {
                logger.warn("findByIdLean after claim miss failed", {
                  paymentId,
                  message: error.message,
                });
              }
              logger.info("Payment retry claim skipped (idempotent)", {
                paymentId,
                attempt,
                idempotencyKey,
              });
              return { skipped: true, reason: "claim_failed" };
            }

            try {
              const result = await this.attemptCharge(claimed, {
                attempt,
                idempotencyKey,
                reason,
              });

              if (result.success) {
                try {
                  await paymentRepository.updateAutoRetryAttempt(
                    paymentId,
                    attempt,
                    {
                      status: "succeeded",
                      razorpayOrderId:
                        result.razorpayOrderId || claimed.razorpayOrderId,
                      razorpayPaymentId: result.razorpayPaymentId || null,
                      paymentLinkId: result.paymentLinkId || null,
                      paymentLinkUrl: result.paymentLinkUrl || null,
                      reason: result.message || "Charged successfully",
                    }
                  );
                } catch (error) {
                  logger.warn(
                    `updateAutoRetryAttempt(success) failed: ${error.message}`
                  );
                }

                await this.finalizeSuccess(claimed, result);
                return { success: true, ...result };
              }

              try {
                await paymentRepository.updateAutoRetryAttempt(
                  paymentId,
                  attempt,
                  {
                    status: "failed",
                    razorpayOrderId: result.razorpayOrderId || null,
                    paymentLinkId: result.paymentLinkId || null,
                    paymentLinkUrl: result.paymentLinkUrl || null,
                    reason: result.message || "Retry charge failed",
                  }
                );
              } catch (error) {
                logger.warn(
                  `updateAutoRetryAttempt(failed) failed: ${error.message}`
                );
              }

              return await this.scheduleNextOrExhaust(claimed, {
                attempt,
                dayKey,
                errorMessage: result.message || "Retry charge failed",
                reason,
              });
            } catch (error) {
              try {
                await paymentRepository.updateAutoRetryAttempt(
                  paymentId,
                  attempt,
                  {
                    status: "failed",
                    reason: error.message,
                  }
                );
              } catch (updateError) {
                logger.warn(
                  `updateAutoRetryAttempt(catch) failed: ${updateError.message}`
                );
              }

              // Circuit-open and other errors: advance business retry schedule
              return await this.scheduleNextOrExhaust(claimed, {
                attempt,
                dayKey,
                errorMessage: error.message,
                reason,
              });
            }
          } catch (error) {
            logger.error("Payment retry locked section failed", {
              paymentId,
              attempt,
              message: error.message,
            });
            throw error instanceof Error
              ? error
              : new Error(String(error));
          }
        },
        // Keep lock wait short so the worker's 10s job timeout can still fire
        { ttlMs: 15_000, waitMs: 1_500 }
      );
    } catch (error) {
      if (error?.code === "LOCK_NOT_ACQUIRED") {
        // Transient contention — let BullMQ retry / fail cleanly
        throw new Error(
          `Could not acquire payment-retry lock for ${paymentId}`
        );
      }
      throw error instanceof Error ? error : new Error(String(error));
    } finally {
      // Intentionally empty: lock release happens inside withDistributedLock.
      // finally guarantees this function never leaves an unhandled branch.
    }
  }

  async attemptCharge(payment, { attempt, idempotencyKey, reason }) {
    const razorpay = getRazorpay();
    if (!razorpay) {
      return {
        success: false,
        message: "Razorpay is not configured.",
      };
    }

    // 1) Late-capture recovery on the original order (idempotent — no new charge)
    const recovered = await this.tryRecoverCapturedPayment(razorpay, payment);
    if (recovered.success) {
      return recovered;
    }

    // 2) Check a previously issued auto-retry payment link
    const linkPaid = await this.tryRecoverPaymentLink(razorpay, payment);
    if (linkPaid.success) {
      return linkPaid;
    }

    // 3) Tokenized re-charge when Razorpay provided a token on the failed payment
    const tokenCharge = await this.tryTokenCharge(razorpay, payment, attempt);
    if (tokenCharge.attempted) {
      return tokenCharge;
    }

    // 4) Create a fresh payment link for automated recovery
    return this.createRetryPaymentLink(razorpay, payment, attempt, reason);
  }

  async tryRecoverPaymentLink(razorpay, payment) {
    const linkId = payment.notes?.lastAutoRetryPaymentLinkId;
    if (!linkId || typeof razorpay.paymentLink?.fetch !== "function") {
      return { success: false };
    }

    try {
      const link = await razorpayRateLimiter.schedule(
        () =>
          withRetry(() => razorpay.paymentLink.fetch(linkId), {
            retries: 2,
            delayMs: 300,
            shouldRetry: isTransientError,
          }),
        "paymentLink.fetch"
      );

      if (link?.status === "paid") {
        return {
          success: true,
          message: "Previous retry payment link paid",
          paymentLinkId: link.id,
          paymentLinkUrl: link.short_url,
          razorpayPaymentId:
            link.payments?.[0]?.payment_id || link.payments?.[0] || null,
          method: "payment_link",
        };
      }

      return { success: false, message: `Payment link status: ${link?.status}` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async tryRecoverCapturedPayment(razorpay, payment) {
    if (!payment.razorpayOrderId) {
      return { success: false, message: "No order id" };
    }

    try {
      const payments = await razorpayRateLimiter.schedule(
        () =>
          withRetry(
            () => razorpay.orders.fetchPayments(payment.razorpayOrderId),
            { retries: 2, delayMs: 300, shouldRetry: isTransientError }
          ),
        "orders.fetchPayments"
      );

      const items = payments?.items || payments || [];
      const captured = (Array.isArray(items) ? items : []).find(
        (p) => p.status === "captured" || p.status === "authorized"
      );

      if (!captured) {
        return { success: false, message: "No captured payment on order" };
      }

      return {
        success: true,
        message: "Recovered captured Razorpay payment",
        razorpayPaymentId: captured.id,
        razorpayOrderId: payment.razorpayOrderId,
        method: captured.method || "razorpay",
      };
    } catch (error) {
      logger.warn("Recover captured payment failed", {
        paymentId: String(payment._id),
        message: error.message,
      });
      return { success: false, message: error.message };
    }
  }

  async tryTokenCharge(razorpay, payment, attempt) {
    const tokenId =
      payment.notes?.razorpayTokenId ||
      payment.webhookEvents
        ?.slice()
        ?.reverse()
        ?.find((e) => e.event === "payment.failed")
        ?.payload?.token_id ||
      payment.webhookEvents
        ?.slice()
        ?.reverse()
        ?.find((e) => e.event === "payment.failed")
        ?.payload?.token?.id;

    if (!tokenId) {
      return { attempted: false, success: false };
    }

    const customer = payment.customer;
    const receipt = `retry_${String(payment._id).slice(-8)}_${attempt}`;

    try {
      const order = await razorpayRateLimiter.schedule(
        () =>
          withRetry(
            () =>
              razorpay.orders.create({
                amount: payment.amountInPaise,
                currency: payment.currency || "INR",
                receipt,
                payment_capture: 1,
                notes: {
                  bookingId: String(payment.booking?._id || payment.booking || ""),
                  paymentId: String(payment._id),
                  autoRetryAttempt: String(attempt),
                  purpose: "booking_auto_retry",
                },
              }),
            { retries: 2, delayMs: 300, shouldRetry: isTransientError }
          ),
        "orders.create"
      );

      const createTokenPayment =
        typeof razorpay.payments?.createPaymentJson === "function"
          ? (payload) => razorpay.payments.createPaymentJson(payload)
          : typeof razorpay.payments?.create === "function"
            ? (payload) => razorpay.payments.create(payload)
            : null;

      if (!createTokenPayment) {
        return { attempted: false, success: false };
      }

      const charged = await razorpayRateLimiter.schedule(
        () =>
          withRetry(() => createTokenPayment({
            amount: payment.amountInPaise,
            currency: payment.currency || "INR",
            order_id: order.id,
            email: customer?.email,
            contact: customer?.phone,
            customer_id: payment.notes?.razorpayCustomerId,
            token: tokenId,
            notes: {
              paymentId: String(payment._id),
              autoRetryAttempt: String(attempt),
            },
          }), {
            retries: 1,
            delayMs: 400,
            shouldRetry: isTransientError,
          }),
        "payments.create"
      );

      if (charged?.status === "captured" || charged?.status === "authorized") {
        return {
          attempted: true,
          success: true,
          message: "Tokenized retry charge succeeded",
          razorpayOrderId: order.id,
          razorpayPaymentId: charged.id,
          method: charged.method || "card",
        };
      }

      return {
        attempted: true,
        success: false,
        message: `Token charge status: ${charged?.status || "unknown"}`,
        razorpayOrderId: order.id,
        razorpayPaymentId: charged?.id,
      };
    } catch (error) {
      logger.warn("Tokenized retry charge failed", {
        paymentId: String(payment._id),
        message: error.message,
      });
      return {
        attempted: true,
        success: false,
        message: error.message,
      };
    }
  }

  async createRetryPaymentLink(razorpay, payment, attempt, reason) {
    const customer = payment.customer;
    const booking = payment.booking;
    const { keyId } = getRazorpayConfig();
    const clientBase = env.CLIENT_URL || "http://localhost:5173";
    const bookingId = booking?._id || booking;

    try {
      const link = await razorpayRateLimiter.schedule(
        () =>
          withRetry(
            () =>
              razorpay.paymentLink.create({
                amount: payment.amountInPaise,
                currency: payment.currency || "INR",
                accept_partial: false,
                description: `Retry payment for ${booking?.serviceName || "booking"} (attempt ${attempt})`,
                customer: {
                  name: customer?.name || "Customer",
                  email: customer?.email || undefined,
                  contact: customer?.phone || undefined,
                },
                notify: {
                  sms: false,
                  email: true,
                },
                reminder_enable: false,
                callback_url: bookingId
                  ? `${clientBase}/bookings/${bookingId}`
                  : `${clientBase}/bookings`,
                callback_method: "get",
                notes: {
                  paymentId: String(payment._id),
                  bookingId: String(bookingId || ""),
                  autoRetryAttempt: String(attempt),
                  originalOrderId: payment.razorpayOrderId || "",
                  failureReason: reason || payment.failureReason || "",
                  razorpayKeyId: keyId || "",
                },
              }),
            { retries: 2, delayMs: 400, shouldRetry: isTransientError }
          ),
        "paymentLink.create"
      );

      // Persist link on payment notes for customer UI / support
      await paymentRepository.updateById(payment._id, {
        notes: {
          ...(payment.notes && typeof payment.notes === "object"
            ? payment.notes
            : {}),
          lastAutoRetryPaymentLinkId: link.id,
          lastAutoRetryPaymentLinkUrl: link.short_url,
          lastAutoRetryAttempt: attempt,
        },
      });

      // Payment link created — charge is pending customer completion /
      // Razorpay auto-notify. Treat as soft success only if already paid.
      if (link.status === "paid") {
        return {
          success: true,
          message: "Payment link already paid",
          paymentLinkId: link.id,
          paymentLinkUrl: link.short_url,
          razorpayPaymentId: link.payments?.[0] || null,
        };
      }

      // Email the retry link so the customer can complete the charge
      if (customer?.email && link.short_url) {
        try {
          await emailService.sendPaymentRetryLink({
            user: customer,
            payment,
            booking,
            paymentLinkUrl: link.short_url,
            attempt,
            maxAttempts: PAYMENT_AUTO_RETRY.MAX_ATTEMPTS,
          });
        } catch (error) {
          logger.warn(`Retry link email failed: ${error.message}`);
        }
      }

      return {
        success: false,
        message:
          "Automated charge requires customer action — payment link issued",
        paymentLinkId: link.id,
        paymentLinkUrl: link.short_url,
        awaitingCustomer: true,
      };
    } catch (error) {
      logger.warn("Create retry payment link failed", {
        paymentId: String(payment._id),
        message: error.message,
      });
      return { success: false, message: error.message };
    }
  }

  async finalizeSuccess(payment, result) {
    const updated = await paymentRepository.markAutoRetrySucceeded(payment._id, {
      razorpayPaymentId: result.razorpayPaymentId,
      method: result.method || "razorpay",
    });

    const bookingId = payment.booking?._id || payment.booking;
    if (bookingId) {
      await paymentRepository.updateBookingPaymentStatus(bookingId, "Paid");
      try {
        await assignmentService.activateBookingAfterPayment(bookingId);
      } catch (error) {
        logger.warn("Post-retry booking activation failed", {
          bookingId: String(bookingId),
          message: error.message,
        });
      }
    }

    await writePaymentAudit({
      actorId: null,
      action: AUDIT_ACTION.PAY,
      resourceId: payment._id,
      description: "Auto-retry payment succeeded",
      metadata: {
        razorpayPaymentId: result.razorpayPaymentId,
        method: result.method,
        source: "payment_retry_worker",
      },
    });

    const customerId = payment.customer?._id || payment.customer;
    if (customerId) {
      await notificationService.notifyPayment(customerId, {
        title: "Payment successful",
        message: "Your payment went through after an automatic retry.",
        paymentId: payment._id,
        bookingId,
      });

      try {
        await emailService.sendPaymentReceipt({
          user: payment.customer,
          payment: updated || payment,
          booking: payment.booking,
        });
      } catch (error) {
        logger.warn(`Retry success receipt email failed: ${error.message}`);
      }
    }

    await invalidatePaymentCache(payment._id, customerId);
    return updated;
  }

  async scheduleNextOrExhaust(payment, { attempt, dayKey, errorMessage, reason }) {
    if (attempt >= PAYMENT_AUTO_RETRY.MAX_ATTEMPTS) {
      await paymentRepository.markAutoRetryFailedAttempt(payment._id, {
        lastError: errorMessage,
        status: PAYMENT_AUTO_RETRY_STATUS.EXHAUSTED,
      });

      await this.notifyFinalFailure(payment, errorMessage);

      await writePaymentAudit({
        actorId: null,
        action: AUDIT_ACTION.FAIL,
        resourceId: payment._id,
        description: "Auto-retry exhausted (3 attempts)",
        metadata: { dayKey, errorMessage },
      });

      return {
        success: false,
        exhausted: true,
        message: errorMessage,
      };
    }

    const nextAttempt = attempt + 1;
    const idempotencyKey = buildRetryIdempotencyKey(
      payment._id,
      dayKey,
      nextAttempt
    );
    const delayMs = getAutoRetryDelayMs(nextAttempt);
    const nextRetryAt = new Date(Date.now() + delayMs);

    await paymentRepository.markAutoRetryFailedAttempt(payment._id, {
      lastError: errorMessage,
      nextRetryAt,
      status: PAYMENT_AUTO_RETRY_STATUS.QUEUED,
    });

    await enqueuePaymentRetryJob({
      paymentId: payment._id,
      attempt: nextAttempt,
      dayKey,
      idempotencyKey,
      reason: reason || errorMessage,
      trigger: "auto_backoff",
    });

    return {
      success: false,
      scheduledNext: true,
      nextAttempt,
      nextRetryAt,
      message: errorMessage,
    };
  }

  async notifyFinalFailure(payment, errorMessage) {
    const customerId = payment.customer?._id || payment.customer;
    const bookingId = payment.booking?._id || payment.booking;

    if (customerId) {
      await queueInAppNotification({
        userId: customerId,
        title: "Payment retries exhausted",
        message:
          "We could not complete your payment after 3 automatic attempts today. Please pay manually from your booking.",
        type: NOTIFICATION_TYPES.PAYMENT,
        paymentId: payment._id,
        bookingId,
        metadata: { exhausted: true, errorMessage },
      });

      await queuePushNotification({
        userId: customerId,
        title: "Payment retries exhausted",
        body: "Please open your booking and pay manually.",
        data: {
          type: "payment.retry_exhausted",
          paymentId: String(payment._id),
          bookingId: String(bookingId || ""),
          actionUrl: bookingId ? `/bookings/${bookingId}` : "/bookings",
        },
      });
    }

    if (payment.customer?.email) {
      await queueEmailJob({
        method: "sendPaymentRetryExhausted",
        userId: payment.customer._id || customerId,
        payload: {
          user: payment.customer,
          payment,
          booking: payment.booking,
          errorMessage,
        },
      });
    }
  }
}

export default new PaymentRetryService();
