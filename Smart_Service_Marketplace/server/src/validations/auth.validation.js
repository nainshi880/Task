import { body } from "express-validator";
import { strongPasswordRules } from "./password.validation.js";

export const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),

  body("email").isEmail().withMessage("Valid email required"),

  strongPasswordRules("password"),
];

export const loginValidation = [
  body("email").isEmail().withMessage("Valid email required"),

  body("password").notEmpty().withMessage("Password is required"),
];

export const forgotPasswordValidation = [
  body("email").isEmail().withMessage("Valid email required"),
];

export const resetPasswordValidation = [strongPasswordRules("password")];

export const refreshTokenValidation = [
  body("refreshToken").optional().trim().isLength({ min: 20 }),
];
