import { body, param, query } from "express-validator";
import SERVICE_CATEGORIES from "../constants/serviceCategory.js";

export const bookingIdParamValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID."),
];

export const manualAssignValidation = [
  param("bookingId")
    .isMongoId()
    .withMessage("Invalid booking ID."),

  body("technicianId")
    .notEmpty()
    .withMessage("Technician ID is required.")
    .isMongoId()
    .withMessage("Invalid technician ID."),

  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters."),
];

export const availableTechniciansValidation = [
  query("city")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("City must be between 1 and 100 characters."),

  query("skill")
    .optional()
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid skill / service category."),

  query("serviceCategory")
    .optional()
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid service category."),
];

export const updateAvailabilityValidation = [
  body("availability")
    .notEmpty()
    .withMessage("Availability is required.")
    .isBoolean()
    .withMessage("Availability must be a boolean.")
    .toBoolean(),
];

export const updateSkillsValidation = [
  body("skills")
    .isArray({ min: 1 })
    .withMessage("Skills must be a non-empty array."),

  body("skills.*")
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid skill value."),
];
