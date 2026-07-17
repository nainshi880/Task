import { body } from "express-validator";
import { strongPasswordRules } from "./password.validation.js";

export const adminLoginValidation = [
  body("email").isEmail().withMessage("Valid email is required."),
  body("password").notEmpty().withMessage("Password is required."),
];

export const adminProfileValidation = [
  body("fullName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be 2–100 characters."),
  body("phone")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone is too long."),
  body("avatar")
    .optional({ values: "falsy" })
    .trim()
    .isURL()
    .withMessage("Avatar must be a URL."),
  body("department")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Department is too long."),
  body("designation")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Designation is too long."),
];

export const adminChangePasswordValidation = [
  body("currentPassword")
    .trim()
    .notEmpty()
    .withMessage("Current password is required."),
  strongPasswordRules("newPassword"),
  body("confirmPassword")
    .trim()
    .notEmpty()
    .withMessage("Confirm password is required."),
];
