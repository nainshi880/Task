import getRedisClient, { isRedisReady } from "../config/redis.js";

const memoryCache = new Map();

function memoryGet(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;

  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value;
}

function memorySet(key, value, ttlSeconds = 60) {
  memoryCache.set(key, {
    value,
    expiresAt: ttlSeconds
      ? Date.now() + ttlSeconds * 1000
      : null,
  });
}

function memoryDel(key) {
  memoryCache.delete(key);
}

function memoryDelByPrefix(prefix) {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

class CacheService {
  constructor() {
    getRedisClient();
  }

  async get(key) {
    try {
      const redis = getRedisClient();
      if (redis && isRedisReady()) {
        const raw = await redis.get(key);
        return raw ? JSON.parse(raw) : null;
      }
    } catch {
      // fall through to memory
    }

    return memoryGet(key);
  }

  async set(key, value, ttlSeconds = 60) {
    try {
      const redis = getRedisClient();
      if (redis && isRedisReady()) {
        await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
        return;
      }
    } catch {
      // fall through to memory
    }

    memorySet(key, value, ttlSeconds);
  }

  async del(key) {
    try {
      const redis = getRedisClient();
      if (redis && isRedisReady()) {
        await redis.del(key);
      }
    } catch {
      // ignore
    }

    memoryDel(key);
  }

  async invalidatePrefix(prefix) {
    try {
      const redis = getRedisClient();
      if (redis && isRedisReady()) {
        const keys = await redis.keys(`${prefix}*`);
        if (keys.length) {
          await redis.del(...keys);
        }
      }
    } catch {
      // ignore
    }

    memoryDelByPrefix(prefix);
  }
}

export const CACHE_KEYS = {
  BOOKING_ANALYTICS: "bookings:analytics:dashboard",
  BOOKING_LIST_PREFIX: "bookings:list:",
  BOOKING_DETAIL_PREFIX: "bookings:detail:",
  TECH_JOBS_PREFIX: "technicians:jobs:",
  TECH_REPORT_PREFIX: "technicians:reports:",
  TECH_DASHBOARD_PREFIX: "technicians:dashboard:",
  PAYMENT_ANALYTICS: "payments:analytics:dashboard",
  PAYMENT_STATUS_PREFIX: "payments:status:",
  PAYMENT_LIST_PREFIX: "payments:list:",
  PAYMENT_ADMIN_LIST_PREFIX: "payments:admin:list:",
};

export const CACHE_TTL = {
  ANALYTICS: 60,
  LIST: 30,
  DETAIL: 45,
  REPORT: 90,
};

export default new CacheService();
