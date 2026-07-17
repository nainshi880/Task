import express from "express";

import {
  submitReview,
  getTechnicianReviews,
  updateReview,
  deleteReview,
  reportReview,
  getBookingReview,
} from "../controllers/review.controller.js";

import {
  submitReviewValidation,
  technicianReviewsValidation,
  updateReviewValidation,
  deleteReviewValidation,
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

router.get(
  "/booking/:bookingId",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  bookingReviewParamValidation,
  validate,
  getBookingReview
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
  "/:technicianId",
  technicianReviewsValidation,
  validate,
  getTechnicianReviews
);

router.patch(
  "/:id",
  authenticate,
  authorize(ROLES.CUSTOMER),
  updateReviewValidation,
  validate,
  updateReview
);

router.delete(
  "/:id",
  authenticate,
  authorize(ROLES.CUSTOMER),
  deleteReviewValidation,
  validate,
  deleteReview
);

export default router;
