import mongoose from "mongoose";

const serviceCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    iconUrl: {
      type: String,
      trim: true,
      default: "",
    },

    commissionPercent: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },

    gstRate: {
      type: Number,
      default: null,
      min: 0,
      max: 40,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

serviceCategorySchema.index({ isActive: 1, sortOrder: 1, name: 1 });

const ServiceCategory = mongoose.model("ServiceCategory", serviceCategorySchema);

export default ServiceCategory;
