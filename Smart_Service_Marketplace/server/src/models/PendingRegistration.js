import mongoose from "mongoose";
import bcrypt from "bcrypt";
import ROLES from "../constants/roles.js";

const PENDING_TTL_SECONDS = 24 * 60 * 60; // 24 hours

const pendingRegistrationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    role: {
      type: String,
      enum: [ROLES.CUSTOMER, ROLES.TECHNICIAN],
      required: true,
    },

    /** Technician-only fields collected at signup */
    technician: {
      profession: String,
      experience: Number,
      address: String,
      city: String,
      state: String,
      pincode: String,
      profilePhotoUrl: String,
      identityProofUrl: String,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

pendingRegistrationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

pendingRegistrationSchema.statics.hashPassword = async function (password) {
  return bcrypt.hash(password, 10);
};

pendingRegistrationSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

const PendingRegistration = mongoose.model(
  "PendingRegistration",
  pendingRegistrationSchema
);

export const PENDING_REGISTRATION_TTL_MS = PENDING_TTL_SECONDS * 1000;

export default PendingRegistration;
