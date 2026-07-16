import express from "express";

import {
  searchBookings,
  filterBookings,
  listBookings,
  getBookingAnalytics,
} from "../controllers/bookingAnalytics.controller.js";

import {
  bookingSearchQueryValidation,
  bookingFilterQueryValidation,
  bookingListQueryValidation,
} from "../validations/bookingAnalytics.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";
import { bookingSearchLimiter } from "../middlewares/bookingRateLimit.middleware.js";

const router = express.Router();

/*
=====================================
Admin — Booking Search & Analytics
=====================================
*/

router.get(
  "/search",
  authenticate,
  authorize(ROLES.ADMIN),
  bookingSearchLimiter,
  bookingSearchQueryValidation,
  validate,
  searchBookings
);

router.get(
  "/filter",
  authenticate,
  authorize(ROLES.ADMIN),
  bookingSearchLimiter,
  bookingFilterQueryValidation,
  validate,
  filterBookings
);

router.get(
  "/admin/list",
  authenticate,
  authorize(ROLES.ADMIN),
  bookingListQueryValidation,
  validate,
  listBookings
);

router.get(
  "/analytics/dashboard",
  authenticate,
  authorize(ROLES.ADMIN),
  getBookingAnalytics
);

export default router;
