export const PAYMENT_AUTO_RETRY_STATUS = {
  IDLE: "idle",
  QUEUED: "queued",
  IN_PROGRESS: "in_progress",
  SUCCEEDED: "succeeded",
  EXHAUSTED: "exhausted",
  CANCELLED: "cancelled",
};

export const PAYMENT_AUTO_RETRY = {
  /** Max automated charge attempts within the same calendar day */
  MAX_ATTEMPTS: 3,
  /** Base delay (ms) before attempt 1; subsequent delays use exponential backoff */
  BASE_DELAY_MS: 2 * 60 * 1000,
  /** Backoff factor: delay = BASE * factor^(attempt-1) */
  BACKOFF_FACTOR: 3,
  /** Cap so all retries still fit on the same day */
  MAX_DELAY_MS: 6 * 60 * 60 * 1000,
  /** BullMQ worker concurrency */
  WORKER_CONCURRENCY: 8,
  /** Queue-level job throughput (Razorpay-friendly) */
  QUEUE_MAX_PER_SECOND: 5,
  /** Redis sliding-window limit for Razorpay API calls */
  RAZORPAY_MAX_PER_WINDOW: 8,
  RAZORPAY_WINDOW_MS: 1000,
  QUEUE_NAME: "payment-retry",
};

/**
 * Exponential backoff delay for attempt number (1-based).
 * attempt 1 → BASE, 2 → BASE*3, 3 → BASE*9 (capped).
 */
export function getAutoRetryDelayMs(attempt) {
  const n = Math.max(1, Number(attempt) || 1);
  const raw =
    PAYMENT_AUTO_RETRY.BASE_DELAY_MS *
    PAYMENT_AUTO_RETRY.BACKOFF_FACTOR ** (n - 1);
  return Math.min(raw, PAYMENT_AUTO_RETRY.MAX_DELAY_MS);
}

/** Calendar day key in Asia/Kolkata for same-day retry windows */
export function getRetryDayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function buildRetryIdempotencyKey(paymentId, dayKey, attempt) {
  return `payretry:${paymentId}:${dayKey}:${attempt}`;
}

export function buildRetryJobId(paymentId, dayKey, attempt) {
  return `payment-retry_${paymentId}_${dayKey}_${attempt}`;
}

export default {
  PAYMENT_AUTO_RETRY_STATUS,
  PAYMENT_AUTO_RETRY,
  getAutoRetryDelayMs,
  getRetryDayKey,
  buildRetryIdempotencyKey,
  buildRetryJobId,
};
