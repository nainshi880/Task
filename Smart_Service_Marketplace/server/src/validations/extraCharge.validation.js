import { body, param } from "express-validator";

export const bookingIdParamValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID."),
];

export const extraChargeIdParamValidation = [
  param("extraChargeId")
    .isMongoId()
    .withMessage("Invalid extra charge ID."),
];

export const createExtraChargeValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID."),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("description is required.")
    .isLength({ min: 10, max: 2000 })
    .withMessage("description must be between 10 and 2000 characters."),

  body("amount")
    .notEmpty()
    .withMessage("amount is required.")
    .isFloat({ gt: 0 })
    .withMessage("amount must be greater than 0.")
    .toFloat(),
];

export const rejectExtraChargeValidation = [
  param("extraChargeId")
    .isMongoId()
    .withMessage("Invalid extra charge ID."),

  body("rejectionReason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("rejectionReason must be at most 500 characters."),
];

export const acceptExtraChargeValidation = [
  param("extraChargeId")
    .isMongoId()
    .withMessage("Invalid extra charge ID."),
];
