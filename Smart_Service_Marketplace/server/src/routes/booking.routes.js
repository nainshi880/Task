import express from "express";

import {
  createBooking,
  getBookingById,
  getCustomerBookings,
  updateBooking,
  cancelBooking,
  uploadIssueImages as uploadIssueImagesController,
} from "../controllers/booking.controller.js";

import {
  createBookingValidation,
  updateBookingValidation,
  cancelBookingValidation,
  bookingIdValidation,
  getCustomerBookingsValidation,
} from "../validations/booking.validation.js";

import { uploadIssueImages, optionalIssueImagesUpload } from "../middlewares/upload.middleware.js";
import {
  bookingWriteLimiter,
} from "../middlewares/bookingRateLimit.middleware.js";
import validate from "../middlewares/validation.middleware.js";
import { authenticate, requireEmailVerified } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/*
=====================================
Booking CRUD (Customer)
=====================================
*/

router.post(
  "/",
  authenticate,
  requireEmailVerified,
  authorize(ROLES.CUSTOMER),
  bookingWriteLimiter,
  optionalIssueImagesUpload,
  createBookingValidation,
  validate,
  createBooking
);

router.get(
  "/",
  authenticate,
  authorize(ROLES.CUSTOMER),
  getCustomerBookingsValidation,
  validate,
  getCustomerBookings
);

router.get(
  "/:bookingId",
  authenticate,
  authorize(ROLES.CUSTOMER),
  bookingIdValidation,
  validate,
  getBookingById
);

router.put(
  "/:bookingId",
  authenticate,
  authorize(ROLES.CUSTOMER),
  updateBookingValidation,
  validate,
  updateBooking
);

router.patch(
  "/:bookingId/cancel",
  authenticate,
  authorize(ROLES.CUSTOMER),
  cancelBookingValidation,
  validate,
  cancelBooking
);

router.post(
  "/:bookingId/images",
  authenticate,
  authorize(ROLES.CUSTOMER),
  bookingIdValidation,
  validate,
  uploadIssueImages,
  uploadIssueImagesController
);

export default router;
