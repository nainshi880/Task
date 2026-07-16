import mongoose from "mongoose";

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
      enum: [
        "Plumbing",
        "Electrical",
        "Cleaning",
        "Painting",
        "Carpentry",
        "Appliance Repair",
        "AC Repair",
        "Pest Control",
        "Home Shifting",
        "Other",
      ],
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

    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerProfile",
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
      enum: [
        "Pending",
        "Assigned",
        "Accepted",
        "In Progress",
        "Completed",
        "Cancelled",
        "Closed",
      ],
      default: "Pending",
      index: true,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: [
        "Pending",
        "Paid",
        "Refunded",
      ],
      default: "Pending",
    },

    notes: {
      type: String,
      trim: true,
    },

    cancelledBy: {
      type: String,
      enum: [
        "Customer",
        "Technician",
        "Admin",
      ],
    },

    cancellationReason: {
      type: String,
      trim: true,
    },

    completedAt: {
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

const Booking = mongoose.model(
  "Booking",
  bookingSchema
);

export default Booking;