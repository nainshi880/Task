import mongoose from "mongoose";
import BOOKING_STATUS from "../constants/bookingStatus.js";
import SERVICE_CATEGORIES from "../constants/serviceCategory.js";

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    serviceCategory: {
      type: String,
      required: true,
      trim: true,
      enum: SERVICE_CATEGORIES,
    },

    serviceName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    issueImages: [
      {
        type: String,
      },
    ],

    completionImages: [
      {
        type: String,
      },
    ],

    // Stores CustomerProfile.addresses subdocument _id
    address: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    bookingDate: {
      type: Date,
      required: true,
      index: true,
    },

    bookingTime: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
      index: true,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    originalAmount: {
      type: Number,
      default: null,
      min: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },

    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Refunded"],
      default: "Pending",
    },

    notes: {
      type: String,
      trim: true,
    },

    workNotes: {
      type: String,
      trim: true,
    },

    workNotesLog: [
      {
        note: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    pausedAt: {
      type: Date,
    },

    resumedAt: {
      type: Date,
    },

    cancelledBy: {
      type: String,
      enum: ["Customer", "Technician", "Admin"],
    },

    cancellationReason: {
      type: String,
      trim: true,
    },

    rejectionReason: {
      type: String,
      trim: true,
    },

    rejectedAt: {
      type: Date,
    },

    startedAt: {
      type: Date,
    },

    completedAt: {
      type: Date,
    },

    customerConfirmed: {
      type: Boolean,
      default: false,
    },

    customerConfirmedAt: {
      type: Date,
    },

    closedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({
  customer: 1,
  status: 1,
});

bookingSchema.index({
  technician: 1,
  status: 1,
});

// Technician job search / filter / sort optimization
bookingSchema.index({ technician: 1, status: 1, bookingDate: -1 });
bookingSchema.index({ technician: 1, serviceCategory: 1, createdAt: -1 });
bookingSchema.index({ technician: 1, createdAt: -1 });
bookingSchema.index({ technician: 1, completedAt: -1 });
bookingSchema.index({ technician: 1, paymentStatus: 1 });

bookingSchema.index({ serviceName: "text", description: "text" });
bookingSchema.index({ serviceCategory: 1 });
bookingSchema.index({ status: 1, bookingDate: -1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ createdAt: -1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
