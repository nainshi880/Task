import { body, param, query } from "express-validator";
import PAGINATION from "../constants/pagination.js";
import {
  COUPON_DISCOUNT_TYPE,
  COUPON_CATEGORY,
} from "../constants/coupon.js";

export const validateCouponValidation = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("code is required.")
    .isLength({ min: 3, max: 30 })
    .withMessage("code must be between 3 and 30 characters."),

  body("amount")
    .notEmpty()
    .withMessage("amount is required.")
    .isFloat({ gt: 0 })
    .withMessage("amount must be greater than 0.")
    .toFloat(),

  body("bookingId")
    .optional()
    .isMongoId()
    .withMessage("Invalid bookingId."),
];

export const applyCouponValidation = [
  body("bookingId")
    .notEmpty()
    .withMessage("bookingId is required.")
    .isMongoId()
    .withMessage("Invalid bookingId."),

  body("code")
    .trim()
    .notEmpty()
    .withMessage("code is required.")
    .isLength({ min: 3, max: 30 })
    .withMessage("code must be between 3 and 30 characters."),
];

export const bookingIdParamValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID."),
];

export const couponIdValidation = [
  param("couponId")
    .isMongoId()
    .withMessage("Invalid coupon ID."),
];

export const createCouponValidation = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("code is required.")
    .isLength({ min: 3, max: 30 })
    .withMessage("code must be between 3 and 30 characters."),

  body("title")
    .optional()
    .trim()
    .isLength({ max: 120 }),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 }),

  body("discountType")
    .notEmpty()
    .withMessage("discountType is required.")
    .isIn(Object.values(COUPON_DISCOUNT_TYPE))
    .withMessage("discountType must be percentage or flat."),

  body("discountValue")
    .notEmpty()
    .withMessage("discountValue is required.")
    .isFloat({ gt: 0 })
    .withMessage("discountValue must be greater than 0.")
    .toFloat(),

  body("maxDiscountAmount")
    .optional({ nullable: true })
    .isFloat({ gt: 0 })
    .withMessage("maxDiscountAmount must be greater than 0.")
    .toFloat(),

  body("minOrderAmount")
    .optional()
    .isFloat({ min: 0 })
    .toFloat(),

  body("category")
    .optional()
    .isIn(Object.values(COUPON_CATEGORY))
    .withMessage("Invalid coupon category."),

  body("firstOrderOnly")
    .optional()
    .isBoolean()
    .toBoolean(),

  body("validFrom")
    .optional()
    .isISO8601()
    .withMessage("validFrom must be a valid date."),

  body("validUntil")
    .notEmpty()
    .withMessage("validUntil is required.")
    .isISO8601()
    .withMessage("validUntil must be a valid date."),

  body("usageLimit")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .toInt(),

  body("perUserLimit")
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  body("isActive")
    .optional()
    .isBoolean()
    .toBoolean(),
];

export const updateCouponValidation = [
  param("couponId")
    .isMongoId()
    .withMessage("Invalid coupon ID."),

  body("code")
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 }),

  body("title")
    .optional()
    .trim()
    .isLength({ max: 120 }),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 }),

  body("discountType")
    .optional()
    .isIn(Object.values(COUPON_DISCOUNT_TYPE)),

  body("discountValue")
    .optional()
    .isFloat({ gt: 0 })
    .toFloat(),

  body("maxDiscountAmount")
    .optional({ nullable: true })
    .isFloat({ gt: 0 })
    .toFloat(),

  body("minOrderAmount")
    .optional()
    .isFloat({ min: 0 })
    .toFloat(),

  body("category")
    .optional()
    .isIn(Object.values(COUPON_CATEGORY)),

  body("firstOrderOnly")
    .optional()
    .isBoolean()
    .toBoolean(),

  body("validFrom")
    .optional()
    .isISO8601(),

  body("validUntil")
    .optional()
    .isISO8601(),

  body("usageLimit")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .toInt(),

  body("perUserLimit")
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  body("isActive")
    .optional()
    .isBoolean()
    .toBoolean(),
];

export const listCouponsValidation = [
  query("category")
    .optional()
    .isIn(Object.values(COUPON_CATEGORY)),

  query("isActive")
    .optional()
    .isIn(["true", "false"]),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 30 }),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: PAGINATION.MIN_LIMIT, max: PAGINATION.MAX_LIMIT })
    .toInt(),
];
