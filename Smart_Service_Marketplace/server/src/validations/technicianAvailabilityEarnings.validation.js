import { body, query, param } from "express-validator";
import { PAYOUT_STATUS } from "../models/Payout.js";
import PAGINATION from "../constants/pagination.js";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const weekDays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const onlineStatusValidation = [
  body("onlineStatus")
    .notEmpty()
    .withMessage("onlineStatus is required.")
    .isBoolean()
    .withMessage("onlineStatus must be a boolean.")
    .toBoolean(),
];

export const vacationModeValidation = [
  body("vacationMode")
    .notEmpty()
    .withMessage("vacationMode is required.")
    .isBoolean()
    .withMessage("vacationMode must be a boolean.")
    .toBoolean(),

  body("vacationStart")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("vacationStart must be a valid date."),

  body("vacationEnd")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("vacationEnd must be a valid date."),

  body("vacationReason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("vacationReason cannot exceed 500 characters."),
];

export const serviceAreasValidation = [
  body("serviceAreas")
    .isArray({ min: 1 })
    .withMessage("serviceAreas must be a non-empty array."),

  body("serviceAreas.*")
    .trim()
    .notEmpty()
    .withMessage("Service area cannot be empty.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Each service area must be 2-100 characters."),
];

export const monthlyEarningsValidation = [
  query("year")
    .optional()
    .isInt({ min: 2020, max: 2100 })
    .withMessage("year must be a valid year.")
    .toInt(),

  query("month")
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage("month must be between 1 and 12.")
    .toInt(),
];

export const payoutHistoryValidation = [
  query("status")
    .optional()
    .isIn(Object.values(PAYOUT_STATUS))
    .withMessage("Invalid payout status."),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  query("limit")
    .optional()
    .isInt({
      min: PAGINATION.MIN_LIMIT,
      max: PAGINATION.MAX_LIMIT,
    })
    .toInt(),
];

export const requestPayoutValidation = [
  body("amount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("amount must be greater than 0.")
    .toFloat(),

  body("method")
    .optional()
    .isIn(["Bank Transfer", "UPI", "Cash", "Wallet"])
    .withMessage("Invalid payout method."),

  body("periodStart")
    .optional()
    .isISO8601()
    .withMessage("periodStart must be a valid date."),

  body("periodEnd")
    .optional()
    .isISO8601()
    .withMessage("periodEnd must be a valid date."),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 }),
];

export const adminPayoutListValidation = [
  query("status")
    .optional()
    .isIn(Object.values(PAYOUT_STATUS)),

  query("technicianId")
    .optional()
    .isMongoId(),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  query("limit")
    .optional()
    .isInt({
      min: PAGINATION.MIN_LIMIT,
      max: PAGINATION.MAX_LIMIT,
    })
    .toInt(),
];

export const processPayoutValidation = [
  param("payoutId")
    .isMongoId()
    .withMessage("Invalid payout ID."),

  body("status")
    .notEmpty()
    .withMessage("status is required.")
    .isIn(Object.values(PAYOUT_STATUS))
    .withMessage("Invalid payout status."),

  body("transactionId")
    .optional()
    .trim()
    .isLength({ max: 120 }),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 }),
];

export const workingHoursBodyValidation = weekDays.flatMap((day) => [
  body(`workingHours.${day}.isOff`)
    .optional()
    .isBoolean()
    .toBoolean(),
  body(`workingHours.${day}.start`)
    .optional()
    .matches(timeRegex),
  body(`workingHours.${day}.end`)
    .optional()
    .matches(timeRegex),
  body(`${day}.isOff`).optional().isBoolean().toBoolean(),
  body(`${day}.start`).optional().matches(timeRegex),
  body(`${day}.end`).optional().matches(timeRegex),
]);
