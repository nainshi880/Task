import rateLimit from "express-rate-limit";

/** REST: send messages / attachments */
export const chatMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many chat messages. Please slow down.",
  },
});

/** REST: search messages */
export const chatSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many search requests. Please slow down.",
  },
});

/** REST: list / archive operations */
export const chatReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many chat requests. Please try again later.",
  },
});

/**
 * In-memory sliding-window limiter for Socket.IO events.
 * Returns true if the action is allowed.
 */
export function createSocketRateLimiter({
  windowMs = 60_000,
  max = 30,
} = {}) {
  const hits = new Map();

  return function allow(key) {
    const now = Date.now();
    let bucket = hits.get(key);

    if (!bucket || now - bucket.windowStart >= windowMs) {
      bucket = { windowStart: now, count: 0 };
      hits.set(key, bucket);
    }

    bucket.count += 1;

    // Opportunistic cleanup
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (now - v.windowStart >= windowMs) hits.delete(k);
      }
    }

    return bucket.count <= max;
  };
}

export default chatMessageLimiter;
