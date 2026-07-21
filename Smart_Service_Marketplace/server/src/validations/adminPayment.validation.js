import { body, param, query } from "express-validator";
import PAGINATION from "../constants/pagination.js";
import {
  listAdminPaymentsValidation,
  analyticsQueryValidation,
  recoverablePaymentsValidation,
} from "../validations/payment.validation.js";

export const paymentIdParamValidation = [
  param("paymentId").isMongoId().withMessage("Invalid payment ID."),
];

export const adminTransactionListValidation = [...listAdminPaymentsValidation];

export const adminTransactionDetailsValidation = [
  ...paymentIdParamValidation,
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit")
    .optional()
    .isInt({ min: PAGINATION.MIN_LIMIT, max: PAGINATION.MAX_LIMIT })
    .toInt(),
];

export const adminPaymentReportsValidation = [...analyticsQueryValidation];

export const adminRevenueValidation = [...analyticsQueryValidation];

const dateRangeValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit")
    .optional()
    .isInt({ min: PAGINATION.MIN_LIMIT, max: PAGINATION.MAX_LIMIT })
    .toInt(),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("fromDate").optional().isISO8601(),
  query("toDate").optional().isISO8601(),
  query("customerId").optional().isMongoId(),
];

export const adminRefundsListValidation = [...dateRangeValidation];

export const adminFailedPaymentsValidation = [...dateRangeValidation];

export const adminRefundProcessValidation = [
  ...paymentIdParamValidation,
  body("amount").optional().isFloat({ gt: 0 }).toFloat(),
  body("reason").optional().trim().isLength({ max: 500 }),
  body("method").optional().isIn(["razorpay"]),
];

export const adminRecoverPaymentValidation = [...paymentIdParamValidation];

export const adminRecoverableListValidation = [...recoverablePaymentsValidation];

