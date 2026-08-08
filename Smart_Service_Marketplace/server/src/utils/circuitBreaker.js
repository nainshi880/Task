import metricsStore from "./metrics.js";
import logger from "./logger.js";

export const CIRCUIT_STATE = {
  CLOSED: "closed",
  OPEN: "open",
  HALF_OPEN: "half_open",
};

/**
 * Simple circuit breaker for external dependencies (Razorpay, FCM, SMTP).
 * CLOSED → failures accumulate → OPEN (reject fast) → HALF_OPEN probe → CLOSED.
 */
export class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.openMs = options.openMs || 30_000;
    this.state = CIRCUIT_STATE.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.openedAt = null;
    this.lastError = null;
  }

  getSnapshot() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      openedAt: this.openedAt,
      lastError: this.lastError,
    };
  }

  canRequest() {
    if (this.state === CIRCUIT_STATE.CLOSED) return true;
    if (this.state === CIRCUIT_STATE.HALF_OPEN) return true;

    if (
      this.state === CIRCUIT_STATE.OPEN &&
      this.openedAt &&
      Date.now() - this.openedAt >= this.openMs
    ) {
      this.state = CIRCUIT_STATE.HALF_OPEN;
      this.successCount = 0;
      metricsStore.recordCircuit(this.name, "half_open");
      return true;
    }

    return false;
  }

  recordSuccess() {
    this.lastError = null;

    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      this.successCount += 1;
      if (this.successCount >= this.successThreshold) {
        this.state = CIRCUIT_STATE.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.openedAt = null;
        metricsStore.recordCircuit(this.name, "closed");
        logger.info(`Circuit closed: ${this.name}`);
      }
      return;
    }

    this.failureCount = 0;
  }

  recordFailure(error) {
    this.lastError = error?.message || String(error || "unknown");
    this.failureCount += 1;
    metricsStore.recordCircuit(this.name, "failure");

    if (
      this.state === CIRCUIT_STATE.HALF_OPEN ||
      this.failureCount >= this.failureThreshold
    ) {
      this.state = CIRCUIT_STATE.OPEN;
      this.openedAt = Date.now();
      this.successCount = 0;
      metricsStore.recordCircuit(this.name, "open");
      logger.warn(`Circuit opened: ${this.name}`, {
        failureCount: this.failureCount,
        lastError: this.lastError,
      });
    }
  }

  async exec(fn) {
    if (!this.canRequest()) {
      const error = new Error(
        `Circuit open for ${this.name}. Retry after cooldown.`
      );
      error.code = "CIRCUIT_OPEN";
      error.circuit = this.name;
      metricsStore.recordCircuit(this.name, "rejected");
      throw error;
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error);
      throw error;
    }
  }
}

const breakers = new Map();

export function getCircuitBreaker(name, options) {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker(name, options));
  }
  return breakers.get(name);
}

export function getAllCircuitSnapshots() {
  return [...breakers.values()].map((b) => b.getSnapshot());
}

export const razorpayCircuit = getCircuitBreaker("razorpay", {
  failureThreshold: 5,
  openMs: 30_000,
});

export const firebaseCircuit = getCircuitBreaker("firebase_fcm", {
  failureThreshold: 5,
  openMs: 20_000,
});

export const smtpCircuit = getCircuitBreaker("smtp", {
  failureThreshold: 5,
  openMs: 45_000,
});

export default {
  CircuitBreaker,
  getCircuitBreaker,
  getAllCircuitSnapshots,
  razorpayCircuit,
  firebaseCircuit,
  smtpCircuit,
  CIRCUIT_STATE,
};
