import mongoose from "mongoose";
import PAYMENT_STATUS from "../constants/paymentStatus.js";

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },

    purpose: {
      type: String,
      enum: ["booking", "subscription"],
      default: "booking",
      index: true,
    },

    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    amountInPaise: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
    },

    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.CREATED,
      index: true,
    },

    razorpayOrderId: {
      type: String,
      trim: true,
      index: true,
    },

    razorpayPaymentId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },

    razorpaySignature: {
      type: String,
      trim: true,
    },

    method: {
      type: String,
      trim: true,
    },

    receipt: {
      type: String,
      trim: true,
    },

    failureReason: {
      type: String,
      trim: true,
    },

    failureCode: {
      type: String,
      trim: true,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    failedAt: {
      type: Date,
      default: null,
    },

    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastRetryAt: {
      type: Date,
      default: null,
    },

    /**
     * Automated same-day retry pipeline (BullMQ).
     * Idempotency keys prevent duplicate Razorpay charges across workers.
     */
    autoRetry: {
      status: {
        type: String,
        enum: [
          "idle",
          "queued",
          "in_progress",
          "succeeded",
          "exhausted",
          "cancelled",
        ],
        default: "idle",
      },
      dayKey: { type: String, default: null, index: true },
      attemptCount: { type: Number, default: 0, min: 0 },
      maxAttempts: { type: Number, default: 3, min: 1 },
      nextRetryAt: { type: Date, default: null },
      lastError: { type: String, default: "" },
      failureEmailSentAt: { type: Date, default: null },
      exhaustedAt: { type: Date, default: null },
      succeededAt: { type: Date, default: null },
      processedKeys: { type: [String], default: [] },
      attempts: [
        {
          attempt: Number,
          status: {
            type: String,
            enum: ["queued", "running", "succeeded", "failed", "skipped"],
          },
          idempotencyKey: String,
          jobId: String,
          razorpayOrderId: String,
          razorpayPaymentId: String,
          paymentLinkId: String,
          paymentLinkUrl: String,
          reason: String,
          startedAt: Date,
          finishedAt: Date,
        },
      ],
    },

    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    refunds: [
      {
        razorpayRefundId: { type: String, trim: true },
        amount: { type: Number, min: 0 },
        status: {
          type: String,
          enum: ["pending", "processed", "failed"],
          default: "pending",
        },
        reason: { type: String, trim: true },
        method: {
          type: String,
          enum: ["razorpay"],
          default: "razorpay",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    webhookEvents: [
      {
        event: String,
        eventId: String,
        payload: mongoose.Schema.Types.Mixed,
        receivedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    notes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ customer: 1, createdAt: -1 });
paymentSchema.index({ booking: 1, status: 1 });
paymentSchema.index({ razorpayOrderId: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ purpose: 1, status: 1, createdAt: -1 });
paymentSchema.index({ "autoRetry.status": 1, "autoRetry.nextRetryAt": 1 });
paymentSchema.index({ "autoRetry.processedKeys": 1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
 