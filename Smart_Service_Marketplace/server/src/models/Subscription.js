import mongoose from "mongoose";
import {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_TIER,
} from "../constants/subscription.js";

const subscriptionSchema = new mongoose.Schema(
  {
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
      index: true,
    },

    tier: {
      type: String,
      enum: Object.values(SUBSCRIPTION_TIER),
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.CREATED,
      index: true,
    },

    razorpaySubscriptionId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },

    razorpayCustomerId: {
      type: String,
      trim: true,
      default: null,
    },

    currentPeriodStart: {
      type: Date,
      default: null,
    },

    currentPeriodEnd: {
      type: Date,
      default: null,
    },

    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    trialEndsAt: {
      type: Date,
      default: null,
    },

    jobsClaimedThisPeriod: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastPaymentAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ technician: 1, status: 1 });
subscriptionSchema.index({ technician: 1, tier: 1, status: 1 });
subscriptionSchema.index({ status: 1, tier: 1, createdAt: -1 });

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
 