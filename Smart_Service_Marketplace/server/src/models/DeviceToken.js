import mongoose from "mongoose";
import { DEVICE_PLATFORM, PUSH_PROVIDER } from "../constants/push.js";

const deviceTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    token: {
      type: String,
      required: true,
      trim: true,
    },

    provider: {
      type: String,
      enum: Object.values(PUSH_PROVIDER),
      default: PUSH_PROVIDER.FCM,
      index: true,
    },

    platform: {
      type: String,
      enum: Object.values(DEVICE_PLATFORM),
      default: DEVICE_PLATFORM.ANDROID,
    },

    deviceId: {
      type: String,
      trim: true,
      default: "",
    },

    deviceName: {
      type: String,
      trim: true,
      default: "",
    },

    appVersion: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

deviceTokenSchema.index({ token: 1, provider: 1 }, { unique: true });
deviceTokenSchema.index({ user: 1, isActive: 1 });

const DeviceToken = mongoose.model("DeviceToken", deviceTokenSchema);

export default DeviceToken;
