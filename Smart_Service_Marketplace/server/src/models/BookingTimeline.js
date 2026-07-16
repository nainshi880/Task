import mongoose from "mongoose";
import BOOKING_TIMELINE_EVENT from "../constants/bookingTimelineEvent.js";

const bookingTimelineSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

    event: {
      type: String,
      enum: Object.values(BOOKING_TIMELINE_EVENT),
      required: true,
      index: true,
    },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    actorRole: {
      type: String,
      trim: true,
    },

    fromStatus: {
      type: String,
      default: null,
    },

    toStatus: {
      type: String,
      default: null,
    },

    note: {
      type: String,
      trim: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

bookingTimelineSchema.index({ booking: 1, createdAt: 1 });
bookingTimelineSchema.index({ booking: 1, event: 1, createdAt: -1 });

const BookingTimeline = mongoose.model(
  "BookingTimeline",
  bookingTimelineSchema
);

export default BookingTimeline;
