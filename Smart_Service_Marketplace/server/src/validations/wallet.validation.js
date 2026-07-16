import { body, query } from "express-validator";
import PAGINATION from "../constants/pagination.js";
import {
  WALLET_TX_TYPE,
  WALLET_TX_CATEGORY,
  WALLET_TX_STATUS,
} from "../constants/walletTransaction.js";

export const rechargeWalletValidation = [
  body("amount")
    .notEmpty()
    .withMessage("amount is required.")
    .isFloat({ min: 1 })
    .withMessage("amount must be at least 1.")
    .toFloat(),
];

export const verifyRechargeValidation = [
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

export const walletPayValidation = [
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

export const walletRefundValidation = [
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

  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("reason must be at most 500 characters."),
];

export const listWalletTransactionsValidation = [
  query("type")
    .optional()
    .isIn(Object.values(WALLET_TX_TYPE))
    .withMessage("Invalid transaction type."),

  query("category")
    .optional()
    .isIn(Object.values(WALLET_TX_CATEGORY))
    .withMessage("Invalid transaction category."),

  query("status")
    .optional()
    .isIn(Object.values(WALLET_TX_STATUS))
    .withMessage("Invalid transaction status."),

  query("from")
    .optional()
    .isISO8601()
    .withMessage("from must be a valid ISO date."),

  query("to")
    .optional()
    .isISO8601()
    .withMessage("to must be a valid ISO date."),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: PAGINATION.MIN_LIMIT, max: PAGINATION.MAX_LIMIT })
    .toInt(),
];
