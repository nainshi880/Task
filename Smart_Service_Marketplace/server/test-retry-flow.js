 import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose"; // Optional: Use mongoose.Types.ObjectId
import { enqueuePaymentRetryJob } from "./src/queues/paymentRetry.queue.js";
import { getRetryDayKey, buildRetryIdempotencyKey } from "./src/constants/paymentRetry.js";
import logger from "./src/utils/logger.js";

async function testPaymentRetryPipeline() {
  logger.info("🧪 Starting Payment Retry Pipeline Test...");

  // Generate a valid 24-character hex ObjectId string for Mongoose
  const testPaymentId = new mongoose.Types.ObjectId().toString(); // e.g., "66a7b8c9d01234567890abcd"
  
  const dayKey = getRetryDayKey();
  const idempotencyKey = buildRetryIdempotencyKey(testPaymentId, dayKey, 1);

  // 1. Enqueue Attempt #1
  logger.info(`Enqueuing Attempt #1 for Payment ID: ${testPaymentId}...`);
  const enqueueResult = await enqueuePaymentRetryJob({
    paymentId: testPaymentId,
    attempt: 1,
    dayKey,
    idempotencyKey,
    reason: "Insufficient funds (Local Test)",
    trigger: "local_test",
  });

  console.log("Enqueue Result:", enqueueResult);

  // 2. Test Idempotency
  logger.info("Testing Idempotency (Attempting Duplicate Enqueue)...");
  const duplicateResult = await enqueuePaymentRetryJob({
    paymentId: testPaymentId,
    attempt: 1,
    dayKey,
    idempotencyKey,
    reason: "Insufficient funds (Local Test)",
    trigger: "local_test",
  });

  console.log("Duplicate Result (Should show queued: false):", duplicateResult);

  process.exit(0);
}

testPaymentRetryPipeline().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});