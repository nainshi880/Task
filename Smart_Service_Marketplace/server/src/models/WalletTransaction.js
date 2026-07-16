import mongoose from "mongoose";
import {
  WALLET_TX_TYPE,
  WALLET_TX_CATEGORY,
  WALLET_TX_STATUS,
} from "../constants/walletTransaction.js";

const walletTransactionSchema = new mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: Object.values(WALLET_TX_TYPE),
      required: true,
      index: true,
    },

    category: {
      type: String,
      enum: Object.values(WALLET_TX_CATEGORY),
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },

    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: Object.values(WALLET_TX_STATUS),
      default: WALLET_TX_STATUS.COMPLETED,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
      index: true,
    },

    referenceId: {
      type: String,
      trim: true,
      index: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

walletTransactionSchema.index({ customer: 1, createdAt: -1 });
walletTransactionSchema.index({ wallet: 1, createdAt: -1 });
walletTransactionSchema.index({ category: 1, status: 1, createdAt: -1 });

const WalletTransaction = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema
);

export default WalletTransaction;
