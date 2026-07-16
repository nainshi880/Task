import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    totalCredited: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalDebited: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastTransactionAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Wallet = mongoose.model("Wallet", walletSchema);

export default Wallet;
