import { query } from "express-validator";
import BOOKING_STATUS from "../constants/bookingStatus.js";
import SERVICE_CATEGORIES from "../constants/serviceCategory.js";
import PAGINATION from "../constants/pagination.js";

export const bookingPaginationValidation = [
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

export const bookingSortValidation = [
  query("sortBy")
    .optional()
    .isIn([
      "createdAt",
      "updatedAt",
      "bookingDate",
      "amount",
      "status",
      "serviceCategory",
      "serviceName",
    ])
    .withMessage(
      "sortBy must be one of: createdAt, updatedAt, bookingDate, amount, status, serviceCategory, serviceName."
    ),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be asc or desc."),
];

export const bookingFilterValidation = [
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

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid date."),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid date."),

  query("paymentStatus")
    .optional()
    .isIn(["Pending", "Paid", "Refunded"])
    .withMessage("Invalid payment status."),

  query("customerId")
    .optional()
    .isMongoId()
    .withMessage("Invalid customer ID."),

  query("technicianId")
    .optional()
    .isMongoId()
    .withMessage("Invalid technician ID."),
];

export const bookingSearchValidation = [
  query("q")
    .trim()
    .notEmpty()
    .withMessage("Search query (q) is required.")
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters."),
];

export const bookingSearchQueryValidation = [
  ...bookingSearchValidation,
  ...bookingFilterValidation,
  ...bookingPaginationValidation,
  ...bookingSortValidation,
];

export const bookingFilterQueryValidation = [
  ...bookingFilterValidation,
  ...bookingPaginationValidation,
  ...bookingSortValidation,
];

export const bookingListQueryValidation = [
  ...bookingFilterValidation,
  ...bookingPaginationValidation,
  ...bookingSortValidation,
  query("q")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters."),
];
