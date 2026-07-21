import { body, param, query } from "express-validator";
import PAYMENT_STATUS from "../constants/paymentStatus.js";
import PAGINATION from "../constants/pagination.js";

export const createPaymentOrderValidation = [
  body("bookingId")
    .notEmpty()
    .withMessage("bookingId is required.")
    .isMongoId()
    .withMessage("Invalid bookingId."),

  body("amount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("amount must be greater than 0.")
    .toFloat(),
];

export const verifyPaymentValidation = [
  body("razorpay_order_id")
    .trim()
    .notEmpty()
    .withMessage("razorpay_order_id is required."),

  body("razorpay_payment_id")
    .trim()
    .notEmpty()
    .withMessage("razorpay_payment_id is required."),

  body("razorpay_signature")
    .trim()
    .notEmpty()
    .withMessage("razorpay_signature is required."),
];

export const paymentFailureValidation = [
  body("razorpay_order_id")
    .trim()
    .notEmpty()
    .withMessage("razorpay_order_id is required."),

  body("razorpay_payment_id")
    .optional()
    .trim(),

  body("failureReason")
    .optional()
    .trim()
    .isLength({ max: 500 }),

  body("failureCode")
    .optional()
    .trim()
    .isLength({ max: 100 }),
];

export const paymentIdValidation = [
  param("paymentId")
    .isMongoId()
    .withMessage("Invalid payment ID."),
];

export const bookingIdParamValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID."),
];

export const listPaymentsValidation = [
  query("status")
    .optional()
    .isIn(Object.values(PAYMENT_STATUS))
    .withMessage("Invalid payment status."),

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

export const refundPaymentValidation = [
  param("paymentId")
    .isMongoId()
    .withMessage("Invalid payment ID."),

  body("amount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("amount must be greater than 0.")
    .toFloat(),

  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 }),

  body("method")
    .optional()
    .isIn(["razorpay"])
    .withMessage("method must be razorpay."),
];

export const listAdminPaymentsValidation = [
  query("status")
    .optional()
    .isIn(Object.values(PAYMENT_STATUS)),

  query("purpose")
    .optional()
    .isIn(["booking"]),

  query("customerId")
    .optional()
    .isMongoId(),

  query("from")
    .optional()
    .isISO8601(),

  query("to")
    .optional()
    .isISO8601(),

  query("q").optional().trim().isLength({ min: 1, max: 100 }),
  query("search").optional().trim().isLength({ min: 1, max: 100 }),

  query("sortBy")
    .optional()
    .isIn(["createdAt", "amount", "status", "updatedAt"]),

  query("sortOrder").optional().isIn(["asc", "desc"]),

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

export const analyticsQueryValidation = [
  query("from")
    .optional()
    .isISO8601(),

  query("to")
    .optional()
    .isISO8601(),
];

export const recoverablePaymentsValidation = [
  query("olderThanMinutes")
    .optional()
    .isInt({ min: 1, max: 10080 })
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt(),
];

export const auditLogsQueryValidation = [
  param("paymentId")
    .isMongoId()
    .withMessage("Invalid payment ID."),

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
