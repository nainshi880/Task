import { body, param, query } from "express-validator";

export const createSubscriptionValidation = [
  body("planCode")
    .optional()
    .isIn(["pro"])
    .withMessage("Only Pro subscription can be purchased."),
];

export const verifySubscriptionValidation = [
  body("razorpay_subscription_id")
    .trim()
    .notEmpty()
    .withMessage("razorpay_subscription_id is required."),
  body("razorpay_payment_id").optional().trim(),
  body("razorpay_signature").optional().trim(),
];

export const cancelSubscriptionValidation = [
  body("cancelAtPeriodEnd")
    .optional()
    .isBoolean()
    .withMessage("cancelAtPeriodEnd must be a boolean."),
];

export const adminPlanIdValidation = [
  param("planId").isMongoId().withMessage("Invalid plan id."),
];

export const adminSubscriptionIdValidation = [
  param("subscriptionId").isMongoId().withMessage("Invalid subscription id."),
];

export const adminUpsertPlanValidation = [
  body("code")
    .optional()
    .isIn(["free", "pro"])
    .withMessage("Plan code must be free or pro."),
  body("name").trim().notEmpty().withMessage("Plan name is required."),
  body("description").optional().trim(),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a non-negative number."),
  body("interval")
    .optional()
    .isIn(["monthly", "yearly"])
    .withMessage("Interval must be monthly or yearly."),
  body("features").optional().isArray(),
  body("limits").optional().isObject(),
  body("isActive").optional().isBoolean(),
];

export const adminListSubscriptionsValidation = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("status").optional().trim(),
  query("tier").optional().isIn(["free", "pro"]),
  query("search").optional().trim(),
];

export const adminUpdateSubscriptionValidation = [
  body("status")
    .trim()
    .notEmpty()
    .isIn([
      "created",
      "authenticated",
      "active",
      "past_due",
      "halted",
      "cancelled",
      "completed",
      "expired",
    ])
    .withMessage("Invalid subscription status."),
];
