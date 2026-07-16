import { body, param, query } from "express-validator";
import PAGINATION from "../constants/pagination.js";
import { INVOICE_STATUS } from "../constants/invoice.js";

export const generateInvoiceValidation = [
  body("bookingId")
    .notEmpty()
    .withMessage("bookingId is required.")
    .isMongoId()
    .withMessage("Invalid bookingId."),

  body("gstRate")
    .optional()
    .isFloat({ min: 0, max: 40 })
    .withMessage("gstRate must be between 0 and 40.")
    .toFloat(),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("notes must be at most 1000 characters."),
];

export const invoiceIdValidation = [
  param("invoiceId")
    .isMongoId()
    .withMessage("Invalid invoice ID."),
];

export const bookingIdParamValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID."),
];

export const emailInvoiceValidation = [
  param("invoiceId")
    .isMongoId()
    .withMessage("Invalid invoice ID."),

  body("to")
    .optional()
    .trim()
    .isEmail()
    .withMessage("to must be a valid email."),
];

export const listInvoicesValidation = [
  query("status")
    .optional()
    .isIn(Object.values(INVOICE_STATUS))
    .withMessage("Invalid invoice status."),

  query("customerId")
    .optional()
    .isMongoId()
    .withMessage("Invalid customerId."),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: PAGINATION.MIN_LIMIT, max: PAGINATION.MAX_LIMIT })
    .toInt(),
];

export const previewGstValidation = [
  body("amount")
    .notEmpty()
    .withMessage("amount is required.")
    .isFloat({ gt: 0 })
    .withMessage("amount must be greater than 0.")
    .toFloat(),

  body("gstRate")
    .optional()
    .isFloat({ min: 0, max: 40 })
    .withMessage("gstRate must be between 0 and 40.")
    .toFloat(),

  body("customerState")
    .optional()
    .trim()
    .isLength({ max: 100 }),
];
