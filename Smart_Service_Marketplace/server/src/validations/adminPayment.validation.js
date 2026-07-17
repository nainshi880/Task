import { body, param, query } from "express-validator";
import PAGINATION from "../constants/pagination.js";
import {
  listAdminPaymentsValidation,
  analyticsQueryValidation,
  recoverablePaymentsValidation,
} from "../validations/payment.validation.js";
import {
  adminPayoutListValidation,
} from "../validations/technicianAvailabilityEarnings.validation.js";
import { PAYOUT_STATUS } from "../models/Payout.js";

export const paymentIdParamValidation = [
  param("paymentId").isMongoId().withMessage("Invalid payment ID."),
];

export const payoutIdParamValidation = [
  param("payoutId").isMongoId().withMessage("Invalid payout ID."),
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
  body("method").optional().isIn(["razorpay", "wallet", "manual"]),
];

export const adminRecoverPaymentValidation = [...paymentIdParamValidation];

export const adminRecoverableListValidation = [...recoverablePaymentsValidation];

export const adminPayoutsListValidation = [...adminPayoutListValidation];

export const adminProcessPayoutValidation = [
  ...payoutIdParamValidation,
  body("status")
    .isIn(Object.values(PAYOUT_STATUS))
    .withMessage("Valid payout status is required."),
  body("transactionId").optional().trim().isLength({ max: 200 }),
  body("notes").optional().trim().isLength({ max: 500 }),
];
