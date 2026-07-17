import mongoose from "mongoose";
import SERVICE_CATEGORIES from "../constants/serviceCategory.js";

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    category: {
      type: String,
      required: true,
      enum: SERVICE_CATEGORIES,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },

    shortDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },

    basePrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    durationMinutes: {
      type: Number,
      default: 60,
      min: 15,
      max: 480,
    },

    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },

    features: {
      type: [String],
      default: [],
    },

    faqs: [
      {
        question: { type: String, trim: true, required: true, maxlength: 300 },
        answer: { type: String, trim: true, required: true, maxlength: 1000 },
      },
    ],

    isPopular: {
      type: Boolean,
      default: false,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    bookingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },

    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

serviceSchema.index({ isActive: 1, category: 1, sortOrder: 1 });
serviceSchema.index({ isActive: 1, isPopular: 1 });
serviceSchema.index({ name: "text", description: "text", shortDescription: "text" });

const Service = mongoose.model("Service", serviceSchema);

export default Service;
