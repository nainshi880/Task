import Redis from "ioredis";
import env from "./env.js";
import logger from "../utils/logger.js";

/**
 * Dedicated Redis connection options for BullMQ.
 * BullMQ requires maxRetriesPerRequest: null.
 */
export function getBullmqConnection() {
  const redisUrl = process.env.REDIS_URL || env.REDIS_URL;
  if (!redisUrl) return null;

  return {
    url: redisUrl,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

/**
 * Create a fresh ioredis client (for Socket.IO adapter pub/sub).
 */
export function createRedisPubSubPair() {
  const redisUrl = process.env.REDIS_URL || env.REDIS_URL;
  if (!redisUrl) return null;

  try {
    const pubClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    const subClient = pubClient.duplicate();

    pubClient.on("error", (err) => {
      logger.warn(`Redis pub error: ${err.message}`);
    });
    subClient.on("error", (err) => {
      logger.warn(`Redis sub error: ${err.message}`);
    });

    return { pubClient, subClient };
  } catch (error) {
    logger.warn(`Redis pub/sub init failed: ${error.message}`);
    return null;
  }
}

export function isQueueEnabled() {
  return Boolean(process.env.REDIS_URL || env.REDIS_URL);
}

export default {
  getBullmqConnection,
  createRedisPubSubPair,
  isQueueEnabled,
};
