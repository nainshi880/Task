import mongoose from "mongoose";
import SERVICE_CATEGORIES from "../constants/serviceCategory.js";

const workingDaySchema = new mongoose.Schema(
  {
    isOff: {
      type: Boolean,
      default: false,
    },
    start: {
      type: String,
      default: "09:00",
      trim: true,
    },
    end: {
      type: String,
      default: "18:00",
      trim: true,
    },
  },
  { _id: false }
);

const certificationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    issuedBy: {
      type: String,
      trim: true,
    },
    issuedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    documentUrl: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

const defaultWorkingHours = () => ({
  monday: { isOff: false, start: "09:00", end: "18:00" },
  tuesday: { isOff: false, start: "09:00", end: "18:00" },
  wednesday: { isOff: false, start: "09:00", end: "18:00" },
  thursday: { isOff: false, start: "09:00", end: "18:00" },
  friday: { isOff: false, start: "09:00", end: "18:00" },
  saturday: { isOff: false, start: "09:00", end: "14:00" },
  sunday: { isOff: true, start: "00:00", end: "00:00" },
});

const technicianProfileSchema = new mongoose.Schema(
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
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    profilePhoto: {
      type: String,
      default: null,
    },

    workingCity: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    skills: {
      type: [String],
      enum: SERVICE_CATEGORIES,
      default: [],
    },

    serviceCategories: {
      type: [String],
      enum: SERVICE_CATEGORIES,
      default: [],
    },

    experienceYears: {
      type: Number,
      default: 0,
      min: 0,
      max: 50,
    },

    certifications: [certificationSchema],

    availabilityStatus: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Online / Offline (real-time presence toggle)
    onlineStatus: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Vacation Mode
    vacationMode: {
      type: Boolean,
      default: false,
      index: true,
    },

    vacationStart: {
      type: Date,
      default: null,
    },

    vacationEnd: {
      type: Date,
      default: null,
    },

    vacationReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Service areas (cities / zones technician covers)
    serviceAreas: {
      type: [String],
      default: [],
    },

    workingHours: {
      monday: { type: workingDaySchema, default: () => ({ isOff: false, start: "09:00", end: "18:00" }) },
      tuesday: { type: workingDaySchema, default: () => ({ isOff: false, start: "09:00", end: "18:00" }) },
      wednesday: { type: workingDaySchema, default: () => ({ isOff: false, start: "09:00", end: "18:00" }) },
      thursday: { type: workingDaySchema, default: () => ({ isOff: false, start: "09:00", end: "18:00" }) },
      friday: { type: workingDaySchema, default: () => ({ isOff: false, start: "09:00", end: "18:00" }) },
      saturday: { type: workingDaySchema, default: () => ({ isOff: false, start: "09:00", end: "14:00" }) },
      sunday: { type: workingDaySchema, default: () => ({ isOff: true, start: "00:00", end: "00:00" }) },
    },

    rating: {
      type: Number,
      default: 5,
      min: 0,
      max: 5,
    },

    totalJobsCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },

    profileCompleted: {
      type: Boolean,
      default: false,
    },

    lastProfileUpdated: {
      type: Date,
      default: Date.now,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

technicianProfileSchema.index({ workingCity: 1, availabilityStatus: 1 });
technicianProfileSchema.index({ onlineStatus: 1, vacationMode: 1 });
technicianProfileSchema.index({ serviceAreas: 1 });
technicianProfileSchema.index({ skills: 1 });
technicianProfileSchema.index({ serviceCategories: 1 });
technicianProfileSchema.index({ isDeleted: 1, createdAt: -1 });

technicianProfileSchema.pre("validate", function (next) {
  if ((!this.skills || this.skills.length === 0) && this.serviceCategories?.length) {
    this.skills = [...this.serviceCategories];
  }
  if ((!this.serviceCategories || this.serviceCategories.length === 0) && this.skills?.length) {
    this.serviceCategories = [...this.skills];
  }
  next();
});

const TechnicianProfile = mongoose.model(
  "TechnicianProfile",
  technicianProfileSchema
);

export { defaultWorkingHours };
export default TechnicianProfile;
