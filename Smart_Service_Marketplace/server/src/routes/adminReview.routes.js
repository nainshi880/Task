import express from "express";

import {
  listAdminReviews,
  listAdminReportedReviews,
  getAdminReviewDetails,
  approveAdminReview,
  rejectAdminReview,
  deleteAdminReview,
  resolveAdminReviewReport,
  getAdminRatingAnalytics,
} from "../controllers/adminReview.controller.js";

import {
  adminReviewListValidation,
  adminReviewDetailsValidation,
  adminModerateReviewValidation,
  adminDeleteReviewValidation,
  adminResolveReportValidation,
  adminReviewAnalyticsValidation,
} from "../validations/review.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get("/analytics", adminReviewAnalyticsValidation, validate, getAdminRatingAnalytics);

router.get("/reported", adminReviewListValidation, validate, listAdminReportedReviews);

router.get("/", adminReviewListValidation, validate, listAdminReviews);

router.get(
  "/:reviewId",
  adminReviewDetailsValidation,
  validate,
  getAdminReviewDetails
);

router.patch(
  "/:reviewId/approve",
  adminModerateReviewValidation,
  validate,
  approveAdminReview
);

router.patch(
  "/:reviewId/reject",
  adminModerateReviewValidation,
  validate,
  rejectAdminReview
);

router.delete(
  "/:reviewId",
  adminDeleteReviewValidation,
  validate,
  deleteAdminReview
);

router.patch(
  "/:reviewId/reports/:reportId",
  adminResolveReportValidation,
  validate,
  resolveAdminReviewReport
);

export default router;
