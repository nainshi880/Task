import { body, param } from "express-validator";
import SERVICE_CATEGORIES from "../constants/serviceCategory.js";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const weekDays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const workingDayValidation = (day) => [
  body(`workingHours.${day}.isOff`)
    .optional()
    .isBoolean()
    .withMessage(`${day}.isOff must be boolean.`)
    .toBoolean(),

  body(`workingHours.${day}.start`)
    .optional()
    .matches(timeRegex)
    .withMessage(`${day}.start must be HH:mm.`),

  body(`workingHours.${day}.end`)
    .optional()
    .matches(timeRegex)
    .withMessage(`${day}.end must be HH:mm.`),
];

export const createTechnicianProfileValidation = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required.")
    .isLength({ min: 3, max: 50 })
    .withMessage("Full name must be between 3 and 50 characters."),

  body("phone")
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage("Phone number must contain 10 digits."),

  body("bio")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Bio cannot exceed 1000 characters."),

  body("workingCity")
    .trim()
    .notEmpty()
    .withMessage("Working city is required.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Working city must be between 2 and 100 characters."),

  body("skills")
    .optional()
    .isArray()
    .withMessage("Skills must be an array."),

  body("skills.*")
    .optional()
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid skill value."),

  body("serviceCategories")
    .optional()
    .isArray()
    .withMessage("Service categories must be an array."),

  body("serviceCategories.*")
    .optional()
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid service category."),

  body("experienceYears")
    .optional()
    .isFloat({ min: 0, max: 50 })
    .withMessage("Experience years must be between 0 and 50.")
    .toFloat(),

  body("availabilityStatus")
    .optional()
    .isBoolean()
    .withMessage("Availability status must be boolean.")
    .toBoolean(),

  body("certifications")
    .optional()
    .isArray()
    .withMessage("Certifications must be an array."),

  body("certifications.*.name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Certification name is required."),

  body("certifications.*.issuedBy")
    .optional()
    .trim()
    .isLength({ max: 100 }),

  body("certifications.*.issuedAt")
    .optional()
    .isISO8601()
    .withMessage("Invalid certification issuedAt date."),

  body("certifications.*.expiresAt")
    .optional()
    .isISO8601()
    .withMessage("Invalid certification expiresAt date."),

  ...weekDays.flatMap(workingDayValidation),
];

export const updateTechnicianProfileValidation = [
  body("fullName")
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Full name must be between 3 and 50 characters."),

  body("phone")
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage("Phone number must contain 10 digits."),

  body("bio")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Bio cannot exceed 1000 characters."),

  body("workingCity")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Working city must be between 2 and 100 characters."),

  body("skills")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Skills must be a non-empty array."),

  body("skills.*")
    .optional()
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid skill value."),

  body("serviceCategories")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Service categories must be a non-empty array."),

  body("serviceCategories.*")
    .optional()
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid service category."),

  body("experienceYears")
    .optional()
    .isFloat({ min: 0, max: 50 })
    .withMessage("Experience years must be between 0 and 50.")
    .toFloat(),

  body("availabilityStatus")
    .optional()
    .isBoolean()
    .withMessage("Availability status must be boolean.")
    .toBoolean(),

  ...weekDays.flatMap(workingDayValidation),
];

export const skillsValidation = [
  body("skills")
    .isArray({ min: 1 })
    .withMessage("Skills must be a non-empty array."),

  body("skills.*")
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid skill value."),
];

export const serviceCategoriesValidation = [
  body("serviceCategories")
    .isArray({ min: 1 })
    .withMessage("Service categories must be a non-empty array."),

  body("serviceCategories.*")
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid service category."),
];

export const availabilityStatusValidation = [
  body("availabilityStatus")
    .notEmpty()
    .withMessage("Availability status is required.")
    .isBoolean()
    .withMessage("Availability status must be boolean.")
    .toBoolean(),
];

export const workingHoursValidation = [
  ...weekDays.flatMap(workingDayValidation),
];

export const certificationValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Certification name is required.")
    .isLength({ min: 2, max: 100 }),

  body("issuedBy")
    .optional()
    .trim()
    .isLength({ max: 100 }),

  body("issuedAt")
    .optional()
    .isISO8601()
    .withMessage("Invalid issuedAt date."),

  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage("Invalid expiresAt date."),

  body("documentUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("documentUrl must be a valid URL."),
];

export const certificationsArrayValidation = [
  body("certifications")
    .isArray()
    .withMessage("Certifications must be an array."),

  body("certifications.*.name")
    .trim()
    .notEmpty()
    .withMessage("Certification name is required."),
];

export const certificationIdValidation = [
  param("certificationId")
    .isMongoId()
    .withMessage("Invalid certification ID."),
];
