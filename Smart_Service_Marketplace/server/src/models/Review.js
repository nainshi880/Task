import mongoose from "mongoose";
import { REVIEW_STATUS, REPORT_STATUS } from "../constants/review.js";

const reportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(REPORT_STATUS),
      default: REPORT_STATUS.OPEN,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    status: {
      type: String,
      enum: Object.values(REVIEW_STATUS),
      default: REVIEW_STATUS.PENDING,
      index: true,
    },

    reports: {
      type: [reportSchema],
      default: [],
    },

    reportCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    moderatedAt: {
      type: Date,
      default: null,
    },

    moderationNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ technician: 1, status: 1, createdAt: -1 });
reviewSchema.index({ status: 1, reportCount: -1 });
reviewSchema.index({ createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
