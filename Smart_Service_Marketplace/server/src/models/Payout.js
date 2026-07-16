import mongoose from "mongoose";

const PAYOUT_STATUS = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

const payoutSchema = new mongoose.Schema(
  {
    technician: {
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

    currency: {
      type: String,
      default: "INR",
      trim: true,
    },

    status: {
      type: String,
      enum: Object.values(PAYOUT_STATUS),
      default: PAYOUT_STATUS.PENDING,
      index: true,
    },

    periodStart: {
      type: Date,
      required: true,
    },

    periodEnd: {
      type: Date,
      required: true,
    },

    method: {
      type: String,
      enum: ["Bank Transfer", "UPI", "Cash", "Wallet"],
      default: "Bank Transfer",
    },

    transactionId: {
      type: String,
      trim: true,
    },

    jobsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    bookingIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
      },
    ],

    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

payoutSchema.index({ technician: 1, createdAt: -1 });
payoutSchema.index({ technician: 1, status: 1 });
payoutSchema.index({ periodStart: 1, periodEnd: 1 });

const Payout = mongoose.model("Payout", payoutSchema);

export { PAYOUT_STATUS };
export default Payout;
