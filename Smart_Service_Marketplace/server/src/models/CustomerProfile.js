import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      enum: ["Home", "Office", "Other"],
      default: "Home",
    },

    street: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    state: {
      type: String,
      trim: true,
    },

    country: {
      type: String,
      trim: true,
    },

    postalCode: {
      type: String,
      trim: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: true,
  }
);

const customerProfileSchema = new mongoose.Schema(
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

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },

    dateOfBirth: {
      type: Date,
    },

    avatar: {
      type: String,
      default: null,
    },

    addresses: [addressSchema],

    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },

    preferences: {
      emailNotification: {
        type: Boolean,
        default: true,
      },
      pushNotification: {
        type: Boolean,
        default: true,
      },
      whatsappNotification: {
        type: Boolean,
        default: true,
      },
      inAppNotification: {
        type: Boolean,
        default: true,
      },
      bookingNotifications: {
        type: Boolean,
        default: true,
      },
      paymentNotifications: {
        type: Boolean,
        default: true,
      },
      systemNotifications: {
        type: Boolean,
        default: true,
      },
      promotionalNotifications: {
        type: Boolean,
        default: true,
      },
    },

      privacy: {

  showPhone: {
    type: Boolean,
    default: false,
  },

  showEmail: {
    type: Boolean,
    default: false,
  },

  shareLocation: {
    type: Boolean,
    default: true,
  },

},

lastProfileUpdated: {
  type: Date,
  default: Date.now,
},


    profileCompleted: {
      type: Boolean,
      default: false,
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

// Performance indexes for search, filter, sort, and pagination
customerProfileSchema.index({ fullName: "text", phone: "text" });
customerProfileSchema.index({ "addresses.city": 1 });
customerProfileSchema.index({ gender: 1 });
customerProfileSchema.index({ profileCompleted: 1 });
customerProfileSchema.index({ isDeleted: 1, createdAt: -1 });
customerProfileSchema.index({ isDeleted: 1, "addresses.city": 1 });
customerProfileSchema.index({ isDeleted: 1, gender: 1 });
customerProfileSchema.index({ lastProfileUpdated: -1 });
customerProfileSchema.index({ fullName: 1 });

const CustomerProfile = mongoose.model(
  "CustomerProfile",
  customerProfileSchema
);

export default CustomerProfile;