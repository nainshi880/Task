import mongoose from "mongoose";
import { ADMIN_PERMISSIONS } from "../constants/adminAuth.js";

const adminProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    avatar: {
      type: String,
      default: null,
    },

    department: {
      type: String,
      trim: true,
      default: "",
    },

    designation: {
      type: String,
      trim: true,
      default: "Administrator",
    },

    permissions: {
      type: [String],
      enum: Object.values(ADMIN_PERMISSIONS),
      default: Object.values(ADMIN_PERMISSIONS),
    },

    lastActiveAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const AdminProfile = mongoose.model("AdminProfile", adminProfileSchema);

export default AdminProfile;
