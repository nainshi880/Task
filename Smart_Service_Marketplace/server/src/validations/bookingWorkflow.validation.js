import { body, param, query } from "express-validator";
import BOOKING_STATUS from "../constants/bookingStatus.js";
import PAGINATION from "../constants/pagination.js";

export const workflowBookingIdValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID."),
];

export const rejectJobValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID."),

  body("rejectionReason")
    .trim()
    .notEmpty()
    .withMessage("Rejection reason is required.")
    .isLength({ min: 3, max: 500 })
    .withMessage(
      "Rejection reason must be between 3 and 500 characters."
    ),
];

export const completeJobValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID."),

  body("workNotes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Work notes cannot exceed 1000 characters."),
];

export const pauseJobValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID."),

  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Pause reason cannot exceed 500 characters."),
];

export const workNotesValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID."),

  body("note")
    .trim()
    .notEmpty()
    .withMessage("Work note is required.")
    .isLength({ min: 2, max: 1000 })
    .withMessage("Work note must be between 2 and 1000 characters."),
];

export const technicianBookingsValidation = [
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
