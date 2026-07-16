import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    seq: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Counter = mongoose.model("Counter", counterSchema);

/**
 * Atomically increments and returns the next sequence for a key.
 * Format example: INV-2026-00001
 */
export async function getNextInvoiceNumber(session = null) {
  const year = new Date().getFullYear();
  const key = `invoice_${year}`;

  const opts = {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  };
  if (session) opts.session = session;

  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    opts
  );

  const seq = String(counter.seq).padStart(5, "0");
  return `INV-${year}-${seq}`;
}

export default Counter;
