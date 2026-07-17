import express from "express";

import {
  submitReview,
  reportReview,
  getBookingReview,
} from "../controllers/review.controller.js";

import {
  submitReviewValidation,
  reportReviewValidation,
  bookingReviewParamValidation,
} from "../validations/review.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize(ROLES.CUSTOMER),
  submitReviewValidation,
  validate,
  submitReview
);

router.post(
  "/:reviewId/report",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN),
  reportReviewValidation,
  validate,
  reportReview
);

router.get(
  "/booking/:bookingId",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  bookingReviewParamValidation,
  validate,
  getBookingReview
);

export default router;
