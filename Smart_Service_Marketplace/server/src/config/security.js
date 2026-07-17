import env from "./env.js";

function parseOrigins() {
  const raw = env.ALLOWED_ORIGINS || env.CLIENT_URL || "";
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function getCorsOptions() {
  const allowedOrigins = parseOrigins();

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "X-API-Key",
      "X-Requested-With",
    ],
    exposedHeaders: ["X-Response-Time"],
    maxAge: 86400,
  };
}

export function getHelmetOptions() {
  const isProduction = env.NODE_ENV === "production";

  return {
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", ...parseOrigins()],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    noSniff: true,
    xssFilter: true,
    frameguard: { action: "deny" },
  };
}

export function getCookieOptions(maxAgeMs) {
  const isProduction = env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/",
    maxAge: maxAgeMs,
  };
}

export function getCsrfCookieOptions(maxAgeMs) {
  const isProduction = env.NODE_ENV === "production";

  return {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/",
    maxAge: maxAgeMs,
  };
}

export default {
  getCorsOptions,
  getHelmetOptions,
  getCookieOptions,
  getCsrfCookieOptions,
};
