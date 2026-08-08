import { getRedisConnection, isRedisConfigured } from "../config/redis.js";
import env from "../config/env.js";
import logger from "./logger.js";
import metricsStore from "./metrics.js";
import crypto from "crypto";

const PREFIX = `${env.REDIS_PREFIX || "ssm"}:lock:`;

/**
 * Redis distributed lock (SET key token NX PX ttl).
 * Use around critical sections that must run once across the cluster
 * (webhook side-effects, charge attempts, cron elections).
 */
export async function acquireLock(resource, ttlMs = 15_000) {
  const redis = isRedisConfigured() ? getRedisConnection() : null;
  if (!redis) {
    // Local/dev without Redis — soft lock (process-local only)
    metricsStore.recordLock("acquired");
    return {
      acquired: true,
      token: `local_${Date.now()}`,
      local: true,
      resource,
      async release() {
        return true;
      },
    };
  }

  const key = `${PREFIX}${resource}`;
  const token = crypto.randomBytes(16).toString("hex");
  const result = await redis.set(key, token, "PX", ttlMs, "NX");

  if (result !== "OK") {
    metricsStore.recordLock("contested");
    return {
      acquired: false,
      token: null,
      resource,
      async release() {
        return false;
      },
    };
  }

  metricsStore.recordLock("acquired");
  return {
    acquired: true,
    token,
    resource,
    key,
    async release() {
      // Release only if we still own the lock
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      try {
        const released = await redis.eval(script, 1, key, token);
        return Number(released) === 1;
      } catch (error) {
        logger.warn(`Lock release failed for ${resource}: ${error.message}`);
        return false;
      }
    },
  };
}

/**
 * Run fn while holding a distributed lock.
 * Throws if lock cannot be acquired.
 */
export async function withDistributedLock(
  resource,
  fn,
  { ttlMs = 15_000, waitMs = 0, retryEveryMs = 100 } = {}
) {
  const deadline = Date.now() + Math.max(0, waitMs);
  let lock = await acquireLock(resource, ttlMs);

  while (!lock.acquired && Date.now() < deadline) {
    await sleep(retryEveryMs);
    lock = await acquireLock(resource, ttlMs);
  }

  if (!lock.acquired) {
    const error = new Error(`Could not acquire lock: ${resource}`);
    error.code = "LOCK_NOT_ACQUIRED";
    throw error;
  }

  try {
    return await fn(lock);
  } finally {
    await lock.release();
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
  acquireLock,
  withDistributedLock,
};
