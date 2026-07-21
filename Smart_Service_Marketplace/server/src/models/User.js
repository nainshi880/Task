import mongoose from "mongoose";
import bcrypt from "bcrypt";
import ROLES from "../constants/roles.js";
import SERVICE_CATEGORIES from "../constants/serviceCategory.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    phone: {
      type: String,
      trim: true,
    },

    deviceToken: {
      type: String,
      trim: true,
      default: null,
    },

    deviceTokens: {
      type: [String],
      default: [],
    },

    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CUSTOMER,
    },

    avatar: {
      type: String,
      default: null,
    },

    city: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deactivatedAt: {
      type: Date,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },

    lastPasswordChangedAt: {
      type: Date,
      default: null,
    },

    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpires: {
      type: Date,
    },

    emailVerificationToken: {
      type: String,
    },

    emailVerificationExpires: {
      type: Date,
    },

    lastLogin: {
      type: Date,
    },

    failedLoginAttempts: {
      type: Number,
      default: 0,
    },

    accountLockedUntil: {
      type: Date,
    },

    profileCompleted: {
      type: Boolean,
      default: false,
    },

    referralCode: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      index: true,
    },

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Technician fields
    availability: {
      type: Boolean,
      default: true,
      index: true,
    },

    rating: {
      type: Number,
      default: 5,
      min: 0,
      max: 5,
      index: true,
    },

    skills: {
      type: [String],
      enum: SERVICE_CATEGORIES,
      default: [],
    },

    maxWorkload: {
      type: Number,
      default: 5,
      min: 1,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },

    loginHistory: [
      {
        ip: { type: String },
        userAgent: { type: String },
        loginTime: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.index({ role: 1, city: 1, availability: 1 });
userSchema.index({ role: 1, skills: 1 });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  // Allow creating users from an already-hashed pending registration password
  if (this.$locals?.passwordAlreadyHashed) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();

  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;

  return user;
};

const User = mongoose.model("User", userSchema);

export default User;
