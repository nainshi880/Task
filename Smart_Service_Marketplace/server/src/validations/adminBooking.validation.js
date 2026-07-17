import { body, param, query } from "express-validator";
import {
  bookingPaginationValidation,
  bookingSortValidation,
  bookingFilterQueryValidation,
  bookingSearchQueryValidation,
} from "../validations/bookingAnalytics.validation.js";
import BOOKING_STATUS from "../constants/bookingStatus.js";
import SERVICE_CATEGORIES from "../constants/serviceCategory.js";

export const bookingIdParamValidation = [
  param("bookingId").isMongoId().withMessage("Invalid booking ID."),
];

export const adminBookingListValidation = [
  ...bookingPaginationValidation,
  ...bookingSortValidation,
  query("customerId").optional().isMongoId(),
  query("technicianId").optional().isMongoId(),
  query("status").optional().isIn(Object.values(BOOKING_STATUS)),
  query("paymentStatus").optional().isIn(["Pending", "Paid", "Refunded"]),
  query("category").optional().isIn(SERVICE_CATEGORIES),
  query("serviceCategory").optional().isIn(SERVICE_CATEGORIES),
  query("fromDate").optional().isISO8601(),
  query("toDate").optional().isISO8601(),
  query("startDate").optional().isISO8601(),
  query("endDate").optional().isISO8601(),
];

export const adminBookingSearchValidation = [
  ...bookingSearchQueryValidation,
  ...bookingPaginationValidation,
  ...bookingSortValidation,
];

export const adminBookingFilterValidation = [
  ...bookingFilterQueryValidation,
  ...bookingPaginationValidation,
  ...bookingSortValidation,
];

export const reassignTechnicianValidation = [
  ...bookingIdParamValidation,
  body("technicianId")
    .isMongoId()
    .withMessage("Valid technicianId is required."),
  body("reason").optional().trim().isLength({ max: 500 }),
];

export const adminCancelBookingValidation = [
  ...bookingIdParamValidation,
  body("reason").optional().trim().isLength({ max: 500 }),
];

export const adminRefundBookingValidation = [
  ...bookingIdParamValidation,
  body("amount").optional().isFloat({ min: 0.01 }),
  body("reason").optional().trim().isLength({ max: 500 }),
  body("method").optional().isIn(["razorpay", "wallet"]),
];

export const adminBookingReportsValidation = [
  query("fromDate").optional().isISO8601(),
  query("toDate").optional().isISO8601(),
  query("startDate").optional().isISO8601(),
  query("endDate").optional().isISO8601(),
  query("status").optional().isIn(Object.values(BOOKING_STATUS)),
  query("category").optional().isIn(SERVICE_CATEGORIES),
  query("serviceCategory").optional().isIn(SERVICE_CATEGORIES),
];
