import { getRedisConnection, isRedisConfigured } from "../config/redis.js";
import { PAYMENT_AUTO_RETRY } from "../constants/paymentRetry.js";
import { razorpayCircuit } from "./circuitBreaker.js";
import logger from "./logger.js";

const KEY_PREFIX = "rl:razorpay:";

/**
 * Sliding-window rate limiter for Razorpay API calls (Redis),
 * wrapped by a circuit breaker so outages fail fast.
 */
class RazorpayRateLimiter {
  constructor({
    max = PAYMENT_AUTO_RETRY.RAZORPAY_MAX_PER_WINDOW,
    windowMs = PAYMENT_AUTO_RETRY.RAZORPAY_WINDOW_MS,
  } = {}) {
    this.max = max;
    this.windowMs = windowMs;
    this.localTimestamps = [];
  }

  async acquire(label = "api") {
    if (isRedisConfigured()) {
      try {
        await this.acquireRedis(label);
        return;
      } catch (error) {
        logger.warn(`Razorpay rate-limiter Redis fallback: ${error.message}`);
      }
    }
    await this.acquireLocal();
  }

  async acquireRedis(label) {
    const redis = getRedisConnection();
    if (!redis) {
      await this.acquireLocal();
      return;
    }

    const key = `${KEY_PREFIX}${label}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const multi = redis.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zcard(key);
    const results = await multi.exec();
    const count = Number(results?.[1]?.[1] || 0);

    if (count >= this.max) {
      const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
      const oldestScore = Number(oldest?.[1] || now);
      const waitMs = Math.max(50, oldestScore + this.windowMs - now + 5);
      await sleep(waitMs);
      return this.acquireRedis(label);
    }

    await redis
      .multi()
      .zadd(key, now, `${now}:${Math.random().toString(36).slice(2, 8)}`)
      .pexpire(key, this.windowMs * 2)
      .exec();
  }

  async acquireLocal() {
    const now = Date.now();
    this.localTimestamps = this.localTimestamps.filter(
      (t) => now - t < this.windowMs
    );

    if (this.localTimestamps.length >= this.max) {
      const waitMs = Math.max(
        50,
        this.localTimestamps[0] + this.windowMs - now + 5
      );
      await sleep(waitMs);
      return this.acquireLocal();
    }

    this.localTimestamps.push(Date.now());
  }

  /**
   * Wrap any Razorpay SDK call with rate limiting + circuit breaker.
   */
  async schedule(fn, label = "api") {
    await this.acquire(label);
    return razorpayCircuit.exec(fn);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const razorpayRateLimiter = new RazorpayRateLimiter();

export default razorpayRateLimiter;
