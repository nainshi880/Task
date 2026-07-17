import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    keyPrefix: {
      type: String,
      required: true,
      index: true,
    },

    keyHash: {
      type: String,
      required: true,
      unique: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    scopes: {
      type: [String],
      default: ["read"],
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    lastUsedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const ApiKey = mongoose.model("ApiKey", apiKeySchema);

export default ApiKey;
