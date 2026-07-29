import Redis from "ioredis";
import env from "./env.js";
import logger from "../utils/logger.js";

let redisClient = null;
let redisDisabled = false;

export function isRedisConfigured() {
  return Boolean(env.REDIS_URL) && !redisDisabled;
}

/**
 * Shared ioredis singleton instance.
 * Used for general caching, rate-limiting, and state management.
 */
export function getRedisConnection() {
  if (!env.REDIS_URL || redisDisabled) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: true,
      retryStrategy(times) {
        // Stop retrying after 10 attempts if Redis keeps failing
        if (times > 10) {
          logger.error("Redis connection retries exhausted. Disabling Redis.");
          disableRedis("Connection retry limit reached");
          return null;
        }
        return Math.min(times * 200, 2000); // Backoff retry delay
      },
    });

    redisClient.on("connect", () => {
      logger.info("Redis client connected successfully");
    });

    redisClient.on("error", (error) => {
      logger.warn(`Redis client error: ${error.message}`);
    });

    return redisClient;
  } catch (error) {
    logger.error(`Failed to initialize Redis client: ${error.message}`);
    disableRedis(error.message);
    return null;
  }
}

/** 
 * Returns a duplicated ioredis connection specifically for BullMQ components (Queues / Workers).
 * Reusing duplicated connections prevents spawning unmanaged connection pools.
 */
export function getBullMqConnection() {
  const mainClient = getRedisConnection();
  if (!mainClient) return null;

  // Duplicating the client reuses connection options while creating a dedicated client stream
  return mainClient.duplicate({
    maxRetriesPerRequest: null,
  });
}

export async function closeRedis() {
  if (!redisClient) return;
  try {
    await redisClient.quit();
    logger.info("Redis connection closed cleanly");
  } catch {
    redisClient.disconnect();
  } finally {
    redisClient = null;
  }
}

export function disableRedis(reason = "") {
  redisDisabled = true;
  if (reason) {
    logger.warn(`Redis disabled: ${reason}`);
  }
}

export default {
  getRedisConnection,
  getBullMqConnection,
  isRedisConfigured,
  closeRedis,
  disableRedis,
};