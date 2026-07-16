import Redis from "ioredis";
import env from "./env.js";

let redisClient = null;
let redisEnabled = false;

export function getRedisClient() {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL || env.REDIS_URL;

  if (!redisUrl) {
    console.warn(
      "REDIS_URL not set — using in-memory cache fallback."
    );
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redisClient.on("error", (err) => {
      redisEnabled = false;
      console.warn("Redis error:", err.message);
    });

    redisClient.on("connect", () => {
      redisEnabled = true;
      console.log("Redis connected.");
    });

    redisClient.connect().catch(() => {
      redisEnabled = false;
      console.warn("Redis connection failed — using memory cache.");
    });

    return redisClient;
  } catch (error) {
    console.warn("Redis init failed — using memory cache:", error.message);
    return null;
  }
}

export function isRedisReady() {
  return Boolean(redisClient && redisEnabled);
}

export default getRedisClient;
