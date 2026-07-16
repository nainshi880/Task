import mongoose from "mongoose";
import { INVOICE_STATUS, GST_TYPE } from "../constants/invoice.js";

const taxLineSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      index: true,
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.ISSUED,
      index: true,
    },

    issuedAt: {
      type: Date,
      default: Date.now,
    },

    // Bill-from (seller / platform)
    seller: {
      name: { type: String, trim: true },
      gstin: { type: String, trim: true },
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
    },

    // Bill-to (customer snapshot)
    billTo: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true },
    },

    serviceDetails: {
      serviceName: { type: String, trim: true },
      serviceCategory: { type: String, trim: true },
      description: { type: String, trim: true },
      bookingDate: { type: Date },
      bookingTime: { type: String, trim: true },
    },

    // Amounts (INR)
    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    gstRate: {
      type: Number,
      required: true,
      min: 0,
      default: 18,
    },

    gstType: {
      type: String,
      enum: Object.values(GST_TYPE),
      required: true,
    },

    cgstRate: { type: Number, default: 0, min: 0 },
    sgstRate: { type: Number, default: 0, min: 0 },
    igstRate: { type: Number, default: 0, min: 0 },

    cgstAmount: { type: Number, default: 0, min: 0 },
    sgstAmount: { type: Number, default: 0, min: 0 },
    igstAmount: { type: Number, default: 0, min: 0 },

    totalTax: {
      type: Number,
      required: true,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
    },

    taxBreakdown: {
      type: [taxLineSchema],
      default: [],
    },

    paymentMethod: {
      type: String,
      trim: true,
      default: null,
    },

    paymentStatus: {
      type: String,
      trim: true,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    emailedAt: {
      type: Date,
      default: null,
    },

    emailCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ customer: 1, createdAt: -1 });
invoiceSchema.index({ issuedAt: -1 });

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
