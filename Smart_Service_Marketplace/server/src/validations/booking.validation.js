import { body, param, query } from "express-validator";
import SERVICE_CATEGORIES from "../constants/serviceCategory.js";
import BOOKING_STATUS from "../constants/bookingStatus.js";
import PAGINATION from "../constants/pagination.js";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createBookingValidation = [
  body("serviceCategory")
    .trim()
    .notEmpty()
    .withMessage("Service category is required.")
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid service category."),

  body("serviceName")
    .trim()
    .notEmpty()
    .withMessage("Service name is required.")
    .isLength({ min: 3, max: 100 })
    .withMessage("Service name must be between 3 and 100 characters."),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters."),

  body("address")
    .notEmpty()
    .withMessage("Address is required.")
    .isMongoId()
    .withMessage("Invalid address ID."),

  body("bookingDate")
    .notEmpty()
    .withMessage("Booking date is required.")
    .isISO8601()
    .withMessage("Booking date must be a valid date."),

  body("bookingTime")
    .trim()
    .notEmpty()
    .withMessage("Booking time is required.")
    .matches(timeRegex)
    .withMessage("Booking time must be in HH:mm (24-hour) format."),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters."),

  body("amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Amount must be a non-negative number.")
    .toFloat(),
];

export const updateBookingValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID."),

  body("serviceCategory")
    .optional()
    .trim()
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid service category."),

  body("serviceName")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Service name must be between 3 and 100 characters."),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters."),

  body("address")
    .optional()
    .isMongoId()
    .withMessage("Invalid address ID."),

  body("bookingDate")
    .optional()
    .isISO8601()
    .withMessage("Booking date must be a valid date."),

  body("bookingTime")
    .optional()
    .trim()
    .matches(timeRegex)
    .withMessage("Booking time must be in HH:mm (24-hour) format."),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters."),

  body("amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Amount must be a non-negative number.")
    .toFloat(),
];

export const cancelBookingValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID."),

  body("cancellationReason")
    .optional()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage(
      "Cancellation reason must be between 3 and 500 characters."
    ),
];

export const bookingIdValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID."),
];

export const getCustomerBookingsValidation = [
  query("status")
    .optional()
    .isIn(Object.values(BOOKING_STATUS))
    .withMessage("Invalid booking status."),

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
