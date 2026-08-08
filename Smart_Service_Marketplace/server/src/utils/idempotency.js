import { getRedisConnection, isRedisConfigured } from "../config/redis.js";
import env from "../config/env.js";
import logger from "./logger.js";

const PREFIX = `${env.REDIS_PREFIX || "ssm"}:idem:`;

/**
 * Cluster-wide idempotency guard.
 * First caller with a key wins; duplicates within TTL are rejected.
 *
 * @returns {{ ok: true, first: boolean } | { ok: false, reason: string, existing?: string }}
 */
export async function claimIdempotencyKey(
  key,
  {
    ttlSeconds = 60 * 60 * 24,
    payload = "1",
  } = {}
) {
  if (!key) {
    return { ok: false, reason: "missing_key" };
  }

  const redis = isRedisConfigured() ? getRedisConnection() : null;
  if (!redis) {
    // Without Redis, allow through (MongoDB unique indexes remain the safety net)
    return { ok: true, first: true, backend: "memory_passthrough" };
  }

  const redisKey = `${PREFIX}${key}`;
  try {
    const result = await redis.set(
      redisKey,
      typeof payload === "string" ? payload : JSON.stringify(payload),
      "EX",
      ttlSeconds,
      "NX"
    );

    if (result === "OK") {
      return { ok: true, first: true, backend: "redis" };
    }

    const existing = await redis.get(redisKey);
    return {
      ok: false,
      reason: "duplicate",
      existing,
      backend: "redis",
    };
  } catch (error) {
    logger.warn(`Idempotency claim failed: ${error.message}`);
    // Fail open to avoid blocking payments if Redis blips — rely on DB uniqueness
    return { ok: true, first: true, backend: "redis_error_passthrough" };
  }
}

export async function releaseIdempotencyKey(key) {
  const redis = isRedisConfigured() ? getRedisConnection() : null;
  if (!redis || !key) return false;
  try {
    await redis.del(`${PREFIX}${key}`);
    return true;
  } catch {
    return false;
  }
}

export async function getIdempotencyValue(key) {
  const redis = isRedisConfigured() ? getRedisConnection() : null;
  if (!redis || !key) return null;
  return redis.get(`${PREFIX}${key}`);
}

export default {
  claimIdempotencyKey,
  releaseIdempotencyKey,
  getIdempotencyValue,
};
