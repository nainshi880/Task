import rateLimit from "express-rate-limit";

export const bookingWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many booking requests. Please try again later.",
  },
});

export const bookingSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many search requests. Please slow down.",
  },
});

export default bookingWriteLimiter;
