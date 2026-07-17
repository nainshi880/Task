import { body } from "express-validator";

export const sendOtpValidation = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("phone is required.")
    .matches(/^[0-9+\-\s]{10,15}$/)
    .withMessage("Invalid phone number."),

  body("purpose")
    .optional()
    .isIn(["login", "verify_phone", "booking", "payment", "general"]),
];

export const verifyOtpValidation = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("phone is required."),

  body("code")
    .trim()
    .notEmpty()
    .withMessage("code is required.")
    .isLength({ min: 4, max: 8 })
    .withMessage("Invalid OTP code."),

  body("purpose")
    .optional()
    .isIn(["login", "verify_phone", "booking", "payment", "general"]),
];
