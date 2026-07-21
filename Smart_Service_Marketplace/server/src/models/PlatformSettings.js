import mongoose from "mongoose";
import { PLATFORM_SETTINGS_KEY } from "../constants/platformSettings.js";
import ROLES from "../constants/roles.js";

const legalDocumentSchema = new mongoose.Schema(
  {
    content: { type: String, default: "" },
    version: { type: String, default: "1.0" },
    updatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const platformSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: PLATFORM_SETTINGS_KEY,
      unique: true,
      immutable: true,
    },

    platformName: {
      type: String,
      trim: true,
      default: "Smart Service Marketplace",
    },

    supportEmail: {
      type: String,
      trim: true,
      default: "",
    },

    supportPhone: {
      type: String,
      trim: true,
      default: "",
    },

    currency: {
      type: String,
      trim: true,
      default: "INR",
    },

    commission: {
      defaultPercent: {
        type: Number,
        default: 10,
        min: 0,
        max: 100,
      },
      minimumPayoutAmount: {
        type: Number,
        default: 100,
        min: 0,
      },
    },

    gst: {
      defaultRate: {
        type: Number,
        default: 18,
        min: 0,
        max: 40,
      },
      companyName: { type: String, trim: true, default: "" },
      gstin: { type: String, trim: true, default: "" },
      address: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      postalCode: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      pricesIncludeGst: { type: Boolean, default: true },
    },

    fees: {
      platformFeePercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      convenienceFeeFlat: {
        type: Number,
        default: 0,
        min: 0,
      },
      minimumBookingAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    notifications: {
      emailEnabled: { type: Boolean, default: true },
      pushEnabled: { type: Boolean, default: true },
      whatsappEnabled: { type: Boolean, default: true },
      bookingReminders: { type: Boolean, default: true },
      promotionalMessages: { type: Boolean, default: true },
    },

    maintenance: {
      enabled: { type: Boolean, default: false },
      message: {
        type: String,
        trim: true,
        default: "The platform is under maintenance. Please try again later.",
      },
      allowedRoles: {
        type: [String],
        default: [ROLES.ADMIN],
      },
      scheduledStart: { type: Date, default: null },
      scheduledEnd: { type: Date, default: null },
    },

    legal: {
      termsOfService: {
        type: legalDocumentSchema,
        default: () => ({}),
      },
      privacyPolicy: {
        type: legalDocumentSchema,
        default: () => ({}),
      },
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PlatformSettings = mongoose.model(
  "PlatformSettings",
  platformSettingsSchema
);

export default PlatformSettings;
