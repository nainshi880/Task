import { body, query } from "express-validator";
import PAGINATION from "../constants/pagination.js";
import { strongPasswordRules } from "./password.validation.js";

// Create / Update Customer Profile

export const customerProfileValidation = [

  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required.")
    .isLength({ min: 3, max: 50 })
    .withMessage(
      "Full name must be between 3 and 50 characters."
    ),

  body("phone")
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage("Phone number must contain 10 digits."),

  body("gender")
    .optional()
    .isIn([
      "Male",
      "Female",
      "Other",
    ])
    .withMessage("Invalid gender."),

  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format."),

  body("emergencyContact.name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Emergency contact name is too long."),

  body("emergencyContact.phone")
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage("Emergency contact phone must contain 10 digits."),

  body("emergencyContact.relationship")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Relationship is too long."),

  body("preferences.emailNotification")
    .optional()
    .isBoolean(),

  body("preferences.smsNotification")
    .optional()
    .isBoolean(),

  body("preferences.pushNotification")
    .optional()
    .isBoolean(),

];

// ============================================
// Change Password Validation
// ============================================

export const changePasswordValidation = [
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

export const preferencesValidation = [

  body("emailNotification")
    .optional()
    .isBoolean(),

  body("smsNotification")
    .optional()
    .isBoolean(),

  body("pushNotification")
    .optional()
    .isBoolean(),

  body("whatsappNotification")
    .optional()
    .isBoolean(),

  body("inAppNotification")
    .optional()
    .isBoolean(),

  body("bookingNotifications")
    .optional()
    .isBoolean(),

  body("paymentNotifications")
    .optional()
    .isBoolean(),

  body("systemNotifications")
    .optional()
    .isBoolean(),

  body("promotionalNotifications")
    .optional()
    .isBoolean(),

];

export const privacyValidation = [

  body("showPhone")
    .optional()
    .isBoolean(),

  body("showEmail")
    .optional()
    .isBoolean(),

  body("shareLocation")
    .optional()
    .isBoolean(),

];

// ============================================
// Pagination Validation
// ============================================

export const paginationValidation = [

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer.")
    .toInt(),

  query("limit")
    .optional()
    .isInt({
      min: PAGINATION.MIN_LIMIT,
      max: PAGINATION.MAX_LIMIT,
    })
    .withMessage(
      `Limit must be between ${PAGINATION.MIN_LIMIT} and ${PAGINATION.MAX_LIMIT}.`
    )
    .toInt(),

];

// ============================================
// Sort Validation
// ============================================

export const sortValidation = [

  query("sortBy")
    .optional()
    .isIn([
      "createdAt",
      "updatedAt",
      "fullName",
      "lastProfileUpdated",
      "profileCompleted",
    ])
    .withMessage(
      "sortBy must be one of: createdAt, updatedAt, fullName, lastProfileUpdated, profileCompleted."
    ),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("sortOrder must be asc or desc."),

];

// ============================================
// Query / Filter Validation
// ============================================

export const customerFilterValidation = [

  query("city")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("City must be between 1 and 100 characters."),

  query("gender")
    .optional()
    .isIn(["Male", "Female", "Other"])
    .withMessage("Invalid gender filter."),

  query("profileCompleted")
    .optional()
    .isIn(["true", "false"])
    .withMessage("profileCompleted must be true or false."),

  query("includeDeleted")
    .optional()
    .isIn(["true", "false", "only"])
    .withMessage("includeDeleted must be true, false, or only."),

];

// ============================================
// Search Validation
// ============================================

export const customerSearchValidation = [

  query("q")
    .trim()
    .notEmpty()
    .withMessage("Search query (q) is required.")
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters."),

];

export const customerListValidation = [
  ...paginationValidation,
  ...sortValidation,
  ...customerFilterValidation,
  query("q")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters."),
];

export const customerSearchQueryValidation = [
  ...customerSearchValidation,
  ...paginationValidation,
  ...sortValidation,
];

export const customerFilterQueryValidation = [
  ...customerFilterValidation,
  ...paginationValidation,
  ...sortValidation,
];
