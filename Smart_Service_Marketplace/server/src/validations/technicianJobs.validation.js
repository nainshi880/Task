import { query } from "express-validator";
import BOOKING_STATUS from "../constants/bookingStatus.js";
import SERVICE_CATEGORIES from "../constants/serviceCategory.js";
import PAGINATION from "../constants/pagination.js";
import BOOKING_TIMELINE_EVENT from "../constants/bookingTimelineEvent.js";

export const technicianJobPaginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer.")
    .toInt(),

  query("limit")
    .optional()
    .isInt({
      min: PAGINATION.MIN_LIMIT,
      max: PAGINATION.MAX_LIMIT,
    })
    .withMessage(
      `Limit must be between ${PAGINATION.MIN_LIMIT} and ${PAGINATION.MAX_LIMIT}.`
    )
    .toInt(),
];

export const technicianJobSortValidation = [
  query("sortBy")
    .optional()
    .isIn([
      "createdAt",
      "updatedAt",
      "bookingDate",
      "amount",
      "status",
      "serviceCategory",
      "completedAt",
    ])
    .withMessage("Invalid sortBy field."),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be asc or desc."),
];

export const technicianJobFilterValidation = [
  query("status")
    .optional()
    .isIn(Object.values(BOOKING_STATUS))
    .withMessage("Invalid booking status."),

  query("category")
    .optional()
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid service category."),

  query("serviceCategory")
    .optional()
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid service category."),

  query("fromDate")
    .optional()
    .isISO8601()
    .withMessage("fromDate must be a valid date."),

  query("toDate")
    .optional()
    .isISO8601()
    .withMessage("toDate must be a valid date."),

  query("paymentStatus")
    .optional()
    .isIn(["Pending", "Paid", "Refunded"])
    .withMessage("Invalid payment status."),
];

export const technicianJobSearchValidation = [
  query("q")
    .trim()
    .notEmpty()
    .withMessage("Search query (q) is required.")
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters."),
];

export const technicianJobListValidation = [
  ...technicianJobFilterValidation,
  ...technicianJobPaginationValidation,
  ...technicianJobSortValidation,
  query("q")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }),
];

export const technicianJobSearchQueryValidation = [
  ...technicianJobSearchValidation,
  ...technicianJobFilterValidation,
  ...technicianJobPaginationValidation,
  ...technicianJobSortValidation,
];

export const technicianJobFilterQueryValidation = [
  ...technicianJobFilterValidation,
  ...technicianJobPaginationValidation,
  ...technicianJobSortValidation,
];

export const technicianActivityValidation = [
  ...technicianJobPaginationValidation,
  query("event")
    .optional()
    .isIn(Object.values(BOOKING_TIMELINE_EVENT))
    .withMessage("Invalid activity event."),
];

export const technicianReportValidation = [
  query("fromDate")
    .optional()
    .isISO8601()
    .withMessage("fromDate must be a valid date."),

  query("toDate")
    .optional()
    .isISO8601()
    .withMessage("toDate must be a valid date."),
];
