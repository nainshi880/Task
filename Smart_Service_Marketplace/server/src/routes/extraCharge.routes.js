import express from "express";
import {
  createExtraCharge,
  listExtraCharges,
  acceptExtraCharge,
  rejectExtraCharge,
} from "../controllers/extraCharge.controller.js";
import {
  createExtraChargeValidation,
  bookingIdParamValidation,
  acceptExtraChargeValidation,
  rejectExtraChargeValidation,
} from "../validations/extraCharge.validation.js";
import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import { uploadIssueImages } from "../middlewares/upload.middleware.js";
import { bookingWriteLimiter } from "../middlewares/bookingRateLimit.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/*
=====================================
Technician — request extra charge (on-site)
Mounted under /technicians as well via technician.routes
=====================================
*/

router.post(
  "/bookings/:bookingId/extra-charges",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  bookingWriteLimiter,
  uploadIssueImages,
  createExtraChargeValidation,
  validate,
  createExtraCharge
);

/*
=====================================
Shared — list for booking participants
=====================================
*/

router.get(
  "/bookings/:bookingId/extra-charges",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  bookingIdParamValidation,
  validate,
  listExtraCharges
);

/*
=====================================
Customer — accept / reject
=====================================
*/

router.post(
  "/extra-charges/:extraChargeId/accept",
  authenticate,
  authorize(ROLES.CUSTOMER),
  bookingWriteLimiter,
  acceptExtraChargeValidation,
  validate,
  acceptExtraCharge
);

router.post(
  "/extra-charges/:extraChargeId/reject",
  authenticate,
  authorize(ROLES.CUSTOMER),
  bookingWriteLimiter,
  rejectExtraChargeValidation,
  validate,
  rejectExtraCharge
);

export default router;
