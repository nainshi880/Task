import mongoose from "mongoose";
import {
  COUPON_DISCOUNT_TYPE,
  COUPON_CATEGORY,
} from "../constants/coupon.js";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    discountType: {
      type: String,
      enum: Object.values(COUPON_DISCOUNT_TYPE),
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },

    // Cap for percentage discounts (INR)
    maxDiscountAmount: {
      type: Number,
      default: null,
      min: 0,
    },

    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    category: {
      type: String,
      enum: Object.values(COUPON_CATEGORY),
      default: COUPON_CATEGORY.GENERAL,
      index: true,
    },

    // First-order-only flag (also implied by category first_order)
    firstOrderOnly: {
      type: Boolean,
      default: false,
    },

    // Referral coupon owner (whose code this is). Null for admin general codes.
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    validFrom: {
      type: Date,
      default: Date.now,
    },

    validUntil: {
      type: Date,
      required: true,
      index: true,
    },

    // null / 0 = unlimited
    usageLimit: {
      type: Number,
      default: null,
      min: 0,
    },

    perUserLimit: {
      type: Number,
      default: 1,
      min: 1,
    },

    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

couponSchema.index({ isActive: 1, validUntil: 1 });
couponSchema.index({ category: 1, isActive: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
