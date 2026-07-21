import mongoose from "mongoose";

const assignmentHistorySchema = new mongoose.Schema(
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

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    method: {
      type: String,
      enum: ["Auto", "Manual", "Claim"],
      required: true,
      index: true,
    },

    reason: {
      type: String,
      trim: true,
    },

    matchScore: {
      type: Number,
      default: 0,
    },

    matchDetails: {
      cityMatch: { type: Boolean, default: false },
      skillMatch: { type: Boolean, default: false },
      availability: { type: Boolean, default: false },
      workload: { type: Number, default: 0 },
      maxWorkload: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      priorityScore: { type: Number, default: 0 },
    },

    previousTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: ["Assigned", "Reassigned", "Failed"],
      default: "Assigned",
    },
  },
  {
    timestamps: true,
  }
);

assignmentHistorySchema.index({ booking: 1, createdAt: -1 });
assignmentHistorySchema.index({ technician: 1, createdAt: -1 });

const AssignmentHistory = mongoose.model(
  "AssignmentHistory",
  assignmentHistorySchema
);

export default AssignmentHistory;
