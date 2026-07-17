import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema(
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

    lastMessageAt: {
      type: Date,
      default: null,
    },

    lastMessagePreview: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    customerUnreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    technicianUnreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },

    archivedAt: {
      type: Date,
      default: null,
    },

    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

chatRoomSchema.index({ customer: 1, lastMessageAt: -1 });
chatRoomSchema.index({ technician: 1, lastMessageAt: -1 });
chatRoomSchema.index({ customer: 1, isArchived: 1, lastMessageAt: -1 });
chatRoomSchema.index({ technician: 1, isArchived: 1, lastMessageAt: -1 });

const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);

export default ChatRoom;
