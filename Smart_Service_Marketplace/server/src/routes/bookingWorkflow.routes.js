import express from "express";

import {
  getTechnicianBookings,
  acceptJob,
  rejectJob,
  startWork,
  uploadCompletionImages,
  completeWork,
  confirmCompletion,
  closeBooking,
} from "../controllers/bookingWorkflow.controller.js";

import {
  workflowBookingIdValidation,
  rejectJobValidation,
  completeJobValidation,
  technicianBookingsValidation,
} from "../validations/bookingWorkflow.validation.js";

import { uploadIssueImages } from "../middlewares/upload.middleware.js";
import { bookingWriteLimiter } from "../middlewares/bookingRateLimit.middleware.js";
import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/*
=====================================
Technician — My Jobs
=====================================
*/

router.get(
  "/technician/me",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  technicianBookingsValidation,
  validate,
  getTechnicianBookings
);

/*
=====================================
Technician — Workflow Actions
=====================================
*/

router.patch(
  "/:bookingId/accept",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  bookingWriteLimiter,
  workflowBookingIdValidation,
  validate,
  acceptJob
);

router.patch(
  "/:bookingId/reject",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  bookingWriteLimiter,
  rejectJobValidation,
  validate,
  rejectJob
);

router.patch(
  "/:bookingId/start",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  bookingWriteLimiter,
  workflowBookingIdValidation,
  validate,
  startWork
);

router.post(
  "/:bookingId/completion-images",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  workflowBookingIdValidation,
  validate,
  uploadIssueImages,
  uploadCompletionImages
);

router.patch(
  "/:bookingId/complete",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  completeJobValidation,
  validate,
  completeWork
);

/*
=====================================
Customer — Confirm & Close
=====================================
*/

router.patch(
  "/:bookingId/confirm-completion",
  authenticate,
  authorize(ROLES.CUSTOMER),
  workflowBookingIdValidation,
  validate,
  confirmCompletion
);

router.patch(
  "/:bookingId/close",
  authenticate,
  authorize(ROLES.CUSTOMER),
  workflowBookingIdValidation,
  validate,
  closeBooking
);

export default router;
