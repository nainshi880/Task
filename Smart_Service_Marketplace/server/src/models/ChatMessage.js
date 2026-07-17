import mongoose from "mongoose";
import { MESSAGE_TYPE, DELIVERY_STATUS } from "../constants/chat.js";

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    fileName: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    size: { type: Number, min: 0 },
    resourceType: {
      type: String,
      enum: ["image", "raw", "video", "auto"],
      default: "auto",
    },
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
      index: true,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    senderRole: {
      type: String,
      enum: ["customer", "technician", "admin", "system"],
      required: true,
    },

    type: {
      type: String,
      enum: Object.values(MESSAGE_TYPE),
      default: MESSAGE_TYPE.TEXT,
      index: true,
    },

    content: {
      type: String,
      trim: true,
      maxlength: 8000,
      default: "",
    },

    /** Lowercase plaintext for search (content may be encrypted at rest). */
    searchText: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: "",
    },

    isEncrypted: {
      type: Boolean,
      default: false,
    },

    attachments: {
      type: [attachmentSchema],
      default: [],
    },

    deliveryStatus: {
      type: String,
      enum: Object.values(DELIVERY_STATUS),
      default: DELIVERY_STATUS.SENT,
      index: true,
    },

    deliveredTo: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
      },
    ],

    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
      },
    ],

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

chatMessageSchema.index({ room: 1, createdAt: -1 });
chatMessageSchema.index({ booking: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1, createdAt: -1 });
chatMessageSchema.index({ searchText: "text" });
chatMessageSchema.index({ room: 1, searchText: 1 });

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

export default ChatMessage;
