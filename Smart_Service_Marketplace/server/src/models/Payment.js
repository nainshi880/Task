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
      enum: ["booking"],
      default: "booking",
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

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
