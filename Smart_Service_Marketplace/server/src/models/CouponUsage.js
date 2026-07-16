import mongoose from "mongoose";
import { COUPON_USAGE_STATUS } from "../constants/coupon.js";

const couponUsageSchema = new mongoose.Schema(
  {
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    originalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: Object.values(COUPON_USAGE_STATUS),
      default: COUPON_USAGE_STATUS.APPLIED,
      index: true,
    },

    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

couponUsageSchema.index({ coupon: 1, customer: 1 });
couponUsageSchema.index(
  { booking: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "applied" } }
);

const CouponUsage = mongoose.model("CouponUsage", couponUsageSchema);

export default CouponUsage;
