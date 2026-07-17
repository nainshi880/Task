import { body, param, query } from "express-validator";
import PAGINATION from "../constants/pagination.js";
import { REVIEW_STATUS, REPORT_STATUS } from "../constants/review.js";

const reviewIdParam = [
  param("reviewId").isMongoId().withMessage("Invalid review ID."),
];

const reportIdParam = [
  param("reportId").isMongoId().withMessage("Invalid report ID."),
];

const paginationQuery = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit")
    .optional()
    .isInt({ min: PAGINATION.MIN_LIMIT, max: PAGINATION.MAX_LIMIT })
    .toInt(),
];

export const submitReviewValidation = [
  body("bookingId").isMongoId().withMessage("Valid booking ID is required."),
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5."),
  body("title").optional().trim().isLength({ max: 150 }),
  body("comment").optional().trim().isLength({ max: 2000 }),
];

export const reportReviewValidation = [
  ...reviewIdParam,
  body("reason")
    .trim()
    .notEmpty()
    .withMessage("Report reason is required.")
    .isLength({ max: 500 }),
];

export const bookingReviewParamValidation = [
  param("bookingId").isMongoId().withMessage("Invalid booking ID."),
];

export const technicianReviewsValidation = [
  param("technicianId").isMongoId().withMessage("Invalid technician ID."),
  ...paginationQuery,
  query("sortBy").optional().isIn(["createdAt", "rating"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
];

export const reviewIdValidation = [
  param("id").isMongoId().withMessage("Invalid review ID."),
];

export const updateReviewValidation = [
  ...reviewIdValidation,
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5."),
  body("title").optional().trim().isLength({ max: 150 }),
  body("comment").optional().trim().isLength({ max: 2000 }),
  body().custom((_value, { req }) => {
    const { rating, title, comment } = req.body;
    if (
      rating === undefined &&
      title === undefined &&
      comment === undefined
    ) {
      throw new Error("At least one of rating, title, or comment is required.");
    }
    return true;
  }),
];

export const deleteReviewValidation = [...reviewIdValidation];

export const adminReviewListValidation = [
  ...paginationQuery,
  query("status")
    .optional()
    .isIn(Object.values(REVIEW_STATUS))
    .withMessage("Invalid review status."),
  query("technicianId").optional().isMongoId(),
  query("customerId").optional().isMongoId(),
  query("rating").optional().isInt({ min: 1, max: 5 }).toInt(),
  query("minRating").optional().isInt({ min: 1, max: 5 }).toInt(),
  query("maxRating").optional().isInt({ min: 1, max: 5 }).toInt(),
  query("reported").optional().isBoolean().toBoolean(),
  query("sortBy")
    .optional()
    .isIn(["createdAt", "rating", "reportCount", "updatedAt"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
];

export const adminReviewDetailsValidation = [...reviewIdParam];

export const adminModerateReviewValidation = [
  ...reviewIdParam,
  body("note").optional().trim().isLength({ max: 500 }),
  body("reason").optional().trim().isLength({ max: 500 }),
];

export const adminDeleteReviewValidation = [
  ...reviewIdParam,
  body("reason").optional().trim().isLength({ max: 500 }),
];

export const adminResolveReportValidation = [
  ...reviewIdParam,
  ...reportIdParam,
  body("status")
    .optional()
    .isIn([REPORT_STATUS.RESOLVED, REPORT_STATUS.DISMISSED]),
  body("note").optional().trim().isLength({ max: 500 }),
];

export const adminReviewAnalyticsValidation = [
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("fromDate").optional().isISO8601(),
  query("toDate").optional().isISO8601(),
  query("technicianId").optional().isMongoId(),
];
