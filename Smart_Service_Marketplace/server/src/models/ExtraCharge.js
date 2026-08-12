import mongoose from "mongoose";
import EXTRA_CHARGE_STATUS from "../constants/extraChargeStatus.js";

const extraChargeSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    images: [
      {
        type: String,
      },
    ],

    status: {
      type: String,
      enum: Object.values(EXTRA_CHARGE_STATUS),
      default: EXTRA_CHARGE_STATUS.PENDING,
      index: true,
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    respondedAt: {
      type: Date,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

extraChargeSchema.index({ booking: 1, status: 1, createdAt: -1 });
extraChargeSchema.index({ customer: 1, status: 1, createdAt: -1 });
extraChargeSchema.index({ technician: 1, createdAt: -1 });

/** At most one open (pending/approved) extra charge per booking. */
extraChargeSchema.index(
  { booking: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          EXTRA_CHARGE_STATUS.PENDING,
          EXTRA_CHARGE_STATUS.APPROVED,
        ],
      },
    },
  }
);

const ExtraCharge = mongoose.model("ExtraCharge", extraChargeSchema);

export default ExtraCharge;
