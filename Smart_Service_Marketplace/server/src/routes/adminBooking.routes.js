import express from "express";

import {
  listAdminBookings,
  searchAdminBookings,
  filterAdminBookings,
  getAdminBookingDetails,
  getAdminBookingTimeline,
  reassignBookingTechnician,
  cancelAdminBooking,
  refundAdminBooking,
  getAdminBookingReports,
} from "../controllers/adminBooking.controller.js";

import {
  bookingIdParamValidation,
  adminBookingListValidation,
  adminBookingSearchValidation,
  adminBookingFilterValidation,
  reassignTechnicianValidation,
  adminCancelBookingValidation,
  adminRefundBookingValidation,
  adminBookingReportsValidation,
} from "../validations/adminBooking.validation.js";

import { bookingSearchLimiter } from "../middlewares/bookingRateLimit.middleware.js";
import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get("/reports", adminBookingReportsValidation, validate, getAdminBookingReports);

router.get("/", adminBookingListValidation, validate, listAdminBookings);

router.get(
  "/search",
  bookingSearchLimiter,
  adminBookingSearchValidation,
  validate,
  searchAdminBookings
);

router.get(
  "/filter",
  bookingSearchLimiter,
  adminBookingFilterValidation,
  validate,
  filterAdminBookings
);

router.get(
  "/:bookingId/timeline",
  bookingIdParamValidation,
  validate,
  getAdminBookingTimeline
);

router.get(
  "/:bookingId",
  bookingIdParamValidation,
  validate,
  getAdminBookingDetails
);

router.patch(
  "/:bookingId/reassign",
  reassignTechnicianValidation,
  validate,
  reassignBookingTechnician
);

router.patch(
  "/:bookingId/cancel",
  adminCancelBookingValidation,
  validate,
  cancelAdminBooking
);

router.post(
  "/:bookingId/refund",
  adminRefundBookingValidation,
  validate,
  refundAdminBooking
);

export default router;
