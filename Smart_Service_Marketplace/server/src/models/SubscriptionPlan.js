import mongoose from "mongoose";
import {
  SUBSCRIPTION_INTERVAL,
  SUBSCRIPTION_TIER,
} from "../constants/subscription.js";

const planLimitsSchema = new mongoose.Schema(
  {
    maxJobClaimsPerMonth: {
      type: Number,
      default: null,
      min: 0,
    },
    priorityBoost: {
      type: Number,
      default: 0,
      min: 0,
    },
    analyticsAccess: {
      type: Boolean,
      default: false,
    },
    unlimitedClaims: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const subscriptionPlanSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      enum: Object.values(SUBSCRIPTION_TIER),
      required: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    priceInPaise: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
    },

    interval: {
      type: String,
      enum: Object.values(SUBSCRIPTION_INTERVAL),
      default: SUBSCRIPTION_INTERVAL.MONTHLY,
      required: true,
    },

    intervalCount: {
      type: Number,
      default: 1,
      min: 1,
    },

    razorpayPlanId: {
      type: String,
      trim: true,
      default: null,
      sparse: true,
      index: true,
    },

    features: {
      type: [String],
      default: [],
    },

    limits: {
      type: planLimitsSchema,
      default: () => ({}),
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Free + Pro monthly + Pro yearly (code alone is no longer unique)
subscriptionPlanSchema.index({ code: 1, interval: 1 }, { unique: true });

const SubscriptionPlan = mongoose.model(
  "SubscriptionPlan",
  subscriptionPlanSchema
);

export default SubscriptionPlan;
