import mongoose from "mongoose";
import {
  BANNER_POSITION,
  BANNER_AUDIENCE,
} from "../constants/platformSettings.js";

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    subtitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },

    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },

    linkUrl: {
      type: String,
      trim: true,
      default: "",
    },

    position: {
      type: String,
      enum: Object.values(BANNER_POSITION),
      default: BANNER_POSITION.HOME_HERO,
      index: true,
    },

    targetAudience: {
      type: String,
      enum: Object.values(BANNER_AUDIENCE),
      default: BANNER_AUDIENCE.ALL,
      index: true,
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

    startsAt: {
      type: Date,
      default: null,
    },

    endsAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

bannerSchema.index({ position: 1, isActive: 1, sortOrder: 1 });

const Banner = mongoose.model("Banner", bannerSchema);

export default Banner;
