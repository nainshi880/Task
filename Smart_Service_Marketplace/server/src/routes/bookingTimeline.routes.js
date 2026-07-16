import express from "express";

import {
  getBookingTimeline,
  getBookingHistory,
  getBookingAuditLogs,
} from "../controllers/bookingTimeline.controller.js";

import { bookingIdParamValidation } from "../validations/assignment.validation.js";
import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/*
=====================================
Booking Timeline / History / Audit
=====================================
*/

router.get(
  "/:bookingId/timeline",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.CUSTOMER, ROLES.TECHNICIAN),
  bookingIdParamValidation,
  validate,
  getBookingTimeline
);

router.get(
  "/:bookingId/history",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.CUSTOMER, ROLES.TECHNICIAN),
  bookingIdParamValidation,
  validate,
  getBookingHistory
);

router.get(
  "/:bookingId/audit-logs",
  authenticate,
  authorize(ROLES.ADMIN),
  bookingIdParamValidation,
  validate,
  getBookingAuditLogs
);

export default router;
