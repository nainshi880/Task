/**
 * Simulate / estimate auto payment-retry load (e.g. 10_000 failures).
 *
 * Usage (from server/):
 *   npm run simulate:payment-retry-load -- --count 10000 --mode estimate
 *   npm run simulate:payment-retry-load -- --count 1000 --mode enqueue --skip-notify --confirm
 *
 * Modes:
 *   estimate  — no DB writes; prints capacity math from current env/constants
 *   enqueue   — inserts Failed Payment docs + enqueueFromFailure (requires --confirm)
 *
 * Safety:
 *   - Prefer --skip-notify (no SMTP/FCM storm)
 *   - Use Razorpay TEST keys only
 *   - Shrink delays via PAYMENT_RETRY_BASE_DELAY_MS for faster observation
 *   - Watch GET /api/v1/health and /metrics while workers run
 */
import "../config/checkEnv.js";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import env from "../config/env.js";
import {
  PAYMENT_AUTO_RETRY,
  getAutoRetryDelayMs,
} from "../constants/paymentRetry.js";
import PAYMENT_STATUS from "../constants/paymentStatus.js";
import ROLES from "../constants/roles.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import paymentRetryService from "../services/paymentRetry.service.js";
import { getPaymentRetryQueue } from "../queues/paymentRetry.queue.js";
import { isRedisConfigured } from "../config/redis.js";
import logger from "../utils/logger.js";

function parseArgs(argv) {
  const out = {
    count: 10000,
    mode: "estimate",
    batch: 200,
    skipNotify: false,
    confirm: false,
    tag: `loadtest_${Date.now()}`,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--count" || a === "-n") out.count = Number(argv[++i]);
    else if (a === "--mode" || a === "-m") out.mode = String(argv[++i]);
    else if (a === "--batch") out.batch = Number(argv[++i]);
    else if (a === "--skip-notify") out.skipNotify = true;
    else if (a === "--confirm") out.confirm = true;
    else if (a === "--tag") out.tag = String(argv[++i]);
    else if (a === "--help" || a === "-h") out.help = true;
  }

  if (!Number.isFinite(out.count) || out.count < 1) out.count = 10000;
  if (!Number.isFinite(out.batch) || out.batch < 1) out.batch = 200;
  out.count = Math.min(out.count, 50_000);
  out.batch = Math.min(out.batch, 1000);
  return out;
}

function printHelp() {
  console.log(`
Payment retry load simulator

  --mode estimate|enqueue   default: estimate
  --count N                 default: 10000 (max 50000)
  --batch N                 insert/enqueue batch size (enqueue mode)
  --skip-notify             skip failure email/FCM/in-app storm
  --confirm                 required for enqueue mode
  --tag LABEL               notes.tag on seeded payments

Examples:
  npm run simulate:payment-retry-load -- --count 10000 --mode estimate
  npm run simulate:payment-retry-load -- --count 500 --mode enqueue --skip-notify --confirm
`);
}

function estimate(count) {
  const attempts = PAYMENT_AUTO_RETRY.MAX_ATTEMPTS;
  const maxJobs = count * attempts;
  const rpPerSec = PAYMENT_AUTO_RETRY.RAZORPAY_MAX_PER_WINDOW;
  const rpWindowMs = PAYMENT_AUTO_RETRY.RAZORPAY_WINDOW_MS;
  const rpPerSecEffective = rpPerSec / (rpWindowMs / 1000);
  // Assume ~2 Razorpay API calls per attempt (fetch/create link or charge)
  const opsPerAttempt = 2;
  const attempt1Seconds = (count * opsPerAttempt) / rpPerSecEffective;
  const webhookPerMin = 120;
  const webhookMinutes = count / webhookPerMin;

  console.log("\n=== Payment retry load ESTIMATE ===\n");
  console.log(`Failures simulated:          ${count.toLocaleString()}`);
  console.log(`Max attempts / day:          ${attempts}`);
  console.log(`Max retry jobs (if all fail): ${maxJobs.toLocaleString()}`);
  console.log("");
  console.log("Retry delays (ms):");
  for (let a = 1; a <= attempts; a++) {
    console.log(`  attempt ${a}: ${getAutoRetryDelayMs(a)} ms`);
  }
  console.log("");
  console.log("Worker / limiter defaults (from env + constants):");
  console.log(`  WORKER_CONCURRENCY:          ${PAYMENT_AUTO_RETRY.WORKER_CONCURRENCY}`);
  console.log(`  QUEUE_MAX_PER_SECOND:        ${PAYMENT_AUTO_RETRY.QUEUE_MAX_PER_SECOND}`);
  console.log(`  JOB_TIMEOUT_MS:              ${PAYMENT_AUTO_RETRY.JOB_TIMEOUT_MS}`);
  console.log(`  RAZORPAY_MAX_PER_WINDOW:     ${rpPerSec} / ${rpWindowMs}ms`);
  console.log(`  PAYMENT_RETRY_ENABLED:       ${env.PAYMENT_RETRY_ENABLED !== false}`);
  console.log(`  REDIS configured:            ${isRedisConfigured()}`);
  console.log("");
  console.log("Bottleneck math:");
  console.log(
    `  Webhook ingest @120/min:     ~${webhookMinutes.toFixed(1)} min to accept ${count} events`
  );
  console.log(
    `  Razorpay drain (attempt 1):  ~${(attempt1Seconds / 60).toFixed(1)} min (${opsPerAttempt} ops × ${count} ÷ ${rpPerSecEffective}/s)`
  );
  console.log(
    `  Full day worst-case jobs:    ${maxJobs.toLocaleString()} across ${attempts} waves`
  );
  console.log("");
  console.log("What the system does under pressure:");
  console.log("  - Caps same-day retries at 3 (IST day key)");
  console.log("  - Idempotent jobIds + Redis locks prevent duplicate charges");
  console.log("  - Razorpay/SMTP/FCM circuits open after consecutive failures");
  console.log("  - BullMQ exhausted jobs move to dead-letter queue");
  console.log("  - Worker concurrency > Razorpay rate → expect JOB_TIMEOUT noise");
  console.log("");
  console.log("Next (safe enqueue):");
  console.log(
    `  npm run simulate:payment-retry-load -- --count ${Math.min(count, 1000)} --mode enqueue --skip-notify --confirm`
  );
  console.log("Then watch: GET /api/v1/health  and  GET /api/v1/metrics\n");
}

async function ensureLoadTestCustomer(tag) {
  const email = `loadtest+payment-retry@ssm.local`;
  let user = await User.findOne({ email });
  if (user) return user;

  user = await User.create({
    name: "Payment Retry Load Test",
    email,
    phone: "9999990000",
    password: `LoadTest_${tag}_NeverLogin!`,
    role: ROLES.CUSTOMER,
    isActive: true,
    isEmailVerified: true,
  });
  return user;
}

async function enqueueLoad({ count, batch, skipNotify, tag }) {
  if (!isRedisConfigured()) {
    throw new Error(
      "REDIS_URL is required for enqueue mode (BullMQ payment-retry queue)."
    );
  }

  await connectDB();
  const customer = await ensureLoadTestCustomer(tag);
  console.log(`Load-test customer: ${customer.email} (${customer._id})`);

  let queued = 0;
  let failed = 0;
  const started = Date.now();

  for (let offset = 0; offset < count; offset += batch) {
    const size = Math.min(batch, count - offset);
    const docs = [];
    const now = Date.now();

    for (let i = 0; i < size; i++) {
      const n = offset + i;
      const amount = 100 + (n % 50);
      docs.push({
        purpose: "booking",
        booking: null,
        customer: customer._id,
        amount,
        amountInPaise: amount * 100,
        currency: "INR",
        status: PAYMENT_STATUS.FAILED,
        razorpayOrderId: `order_load_${tag}_${n}`,
        failureReason: "Simulated load-test payment failure",
        failureCode: "LOAD_TEST",
        failedAt: new Date(),
        notes: {
          loadTest: true,
          tag,
          index: n,
        },
        autoRetry: {
          status: "idle",
          dayKey: null,
          attemptCount: 0,
          maxAttempts: PAYMENT_AUTO_RETRY.MAX_ATTEMPTS,
          processedKeys: [],
          attempts: [],
        },
        createdAt: new Date(now + n),
        updatedAt: new Date(now + n),
      });
    }

    const inserted = await Payment.insertMany(docs, { ordered: false });
    for (const payment of inserted) {
      try {
        const result = await paymentRetryService.enqueueFromFailure(payment, {
          trigger: "load_test",
          reason: "simulatePaymentRetryLoad",
          skipNotify,
        });
        if (result.queued) queued += 1;
        else failed += 1;
      } catch (error) {
        failed += 1;
        logger.warn(`Enqueue failed for ${payment._id}: ${error.message}`);
      }
    }

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `Progress ${Math.min(offset + size, count)}/${count} · queued=${queued} · skipped/fail=${failed} · ${elapsed}s`
    );
  }

  const queue = getPaymentRetryQueue();
  let counts = null;
  if (queue) {
    counts = await queue.getJobCounts(
      "waiting",
      "active",
      "delayed",
      "failed",
      "completed"
    );
  }

  console.log("\n=== Enqueue complete ===");
  console.log(`Inserted + attempted enqueue: ${count}`);
  console.log(`Queued OK:                    ${queued}`);
  console.log(`Not queued / errors:          ${failed}`);
  console.log(`Skip notify:                  ${skipNotify}`);
  if (counts) {
    console.log("payment-retry queue counts:", counts);
  }
  console.log(
    "\nWorkers will process delayed jobs per PAYMENT_RETRY_* delays."
  );
  console.log(
    "Observe health/metrics. Cleanup load-test payments when done:\n" +
      `  db.payments.deleteMany({ "notes.loadTest": true, "notes.tag": "${tag}" })\n`
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.mode === "estimate") {
    estimate(args.count);
    process.exit(0);
  }

  if (args.mode !== "enqueue") {
    console.error(`Unknown mode: ${args.mode}`);
    printHelp();
    process.exit(1);
  }

  if (!args.confirm) {
    console.error(
      "Refusing enqueue without --confirm. Start with --mode estimate, then add --confirm --skip-notify."
    );
    process.exit(1);
  }

  if (args.count > 5000 && !args.skipNotify) {
    console.error(
      "Refusing count>5000 without --skip-notify (would flood email/push)."
    );
    process.exit(1);
  }

  console.log(
    `\nEnqueue mode: count=${args.count} batch=${args.batch} skipNotify=${args.skipNotify} tag=${args.tag}\n`
  );

  try {
    await enqueueLoad(args);
    await mongoose.connection.close().catch(() => {});
    process.exit(0);
  } catch (error) {
    console.error(error);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
}

main();
