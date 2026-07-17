import { body } from "express-validator";
import { strongPasswordRules } from "./password.validation.js";
import SERVICE_CATEGORIES from "../constants/serviceCategory.js";

export const registerValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name is required"),

  body("firstName")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("First name must be between 1 and 50 characters."),

  body("lastName")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name must be between 1 and 50 characters."),

  body("email").isEmail().withMessage("Valid email required"),

  body("phone")
    .optional()
    .trim()
    .matches(/^[0-9+\-\s]{10,15}$/)
    .withMessage("Enter a valid phone number."),

  strongPasswordRules("password"),

  body().custom((_value, { req }) => {
    const name = req.body.name?.trim();
    const firstName = req.body.firstName?.trim();
    const lastName = req.body.lastName?.trim();

    if (!name && !(firstName && lastName)) {
      throw new Error("First name and last name are required.");
    }

    return true;
  }),
];

export const registerTechnicianValidation = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required.")
    .isLength({ min: 1, max: 50 }),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required.")
    .isLength({ min: 1, max: 50 }),

  body("email").isEmail().withMessage("Valid email required"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required.")
    .matches(/^[0-9+\-\s]{10,15}$/)
    .withMessage("Enter a valid phone number."),

  strongPasswordRules("password"),

  body("profession")
    .trim()
    .notEmpty()
    .withMessage("Profession is required.")
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid profession."),

  body("experience")
    .notEmpty()
    .withMessage("Experience is required.")
    .isFloat({ min: 0, max: 50 })
    .withMessage("Experience must be between 0 and 50 years.")
    .toFloat(),

  body("address")
    .trim()
    .notEmpty()
    .withMessage("Address is required.")
    .isLength({ min: 5, max: 300 }),

  body("city")
    .trim()
    .notEmpty()
    .withMessage("City is required.")
    .isLength({ min: 2, max: 100 }),

  body("state")
    .trim()
    .notEmpty()
    .withMessage("State is required.")
    .isLength({ min: 2, max: 100 }),

  body("pincode")
    .trim()
    .notEmpty()
    .withMessage("Pincode is required.")
    .matches(/^[0-9]{4,12}$/)
    .withMessage("Enter a valid pincode."),
];

export const loginValidation = [
  body("email").isEmail().withMessage("Valid email required"),

  body("password").notEmpty().withMessage("Password is required"),
];

export const forgotPasswordValidation = [
  body("email").isEmail().withMessage("Valid email required"),
];

export const verifyForgotPasswordOtpValidation = [
  body("email").isEmail().withMessage("Valid email required"),
  body("code")
    .trim()
    .notEmpty()
    .withMessage("OTP code is required.")
    .isLength({ min: 4, max: 8 })
    .withMessage("Invalid OTP code."),
];

export const resendVerificationEmailValidation = [
  body("email").isEmail().withMessage("Valid email required"),
];

export const resetPasswordValidation = [strongPasswordRules("password")];

export const refreshTokenValidation = [
  body("refreshToken").optional().trim().isLength({ min: 20 }),
];
