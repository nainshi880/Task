import { body, param, query } from "express-validator";
import PAGINATION from "../constants/pagination.js";
import SERVICE_CATEGORIES from "../constants/serviceCategory.js";
import TECHNICIAN_APPLICATION_STATUS from "../constants/technicianApplication.js";

export const technicianIdParamValidation = [
  param("technicianId").isMongoId().withMessage("Invalid technician ID."),
];

export const adminTechnicianListValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit")
    .optional()
    .isInt({ min: PAGINATION.MIN_LIMIT, max: PAGINATION.MAX_LIMIT })
    .toInt(),
  query("sortBy")
    .optional()
    .isIn([
      "createdAt",
      "updatedAt",
      "fullName",
      "rating",
      "totalJobsCompleted",
      "applicationStatus",
    ]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
  query("q").optional().trim().isLength({ max: 200 }),
  query("search").optional().trim().isLength({ max: 200 }),
  query("applicationStatus")
    .optional()
    .isIn(Object.values(TECHNICIAN_APPLICATION_STATUS)),
  query("isSuspended").optional().isIn(["true", "false"]),
  query("city").optional().trim().isLength({ max: 100 }),
  query("workingCity").optional().trim().isLength({ max: 100 }),
  query("skill").optional().isIn(SERVICE_CATEGORIES),
  query("includeDeleted").optional().isIn(["true", "false", "only"]),
];

export const rejectApplicationValidation = [
  ...technicianIdParamValidation,
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason must be at most 500 characters."),
];

export const suspendTechnicianValidation = [
  ...technicianIdParamValidation,
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason must be at most 500 characters."),
];

export const adminAvailabilityValidation = [
  ...technicianIdParamValidation,
  body("availabilityStatus").optional().isBoolean().toBoolean(),
  body("onlineStatus").optional().isBoolean().toBoolean(),
  body("vacationMode").optional().isBoolean().toBoolean(),
  body("vacationStart").optional().isISO8601(),
  body("vacationEnd").optional().isISO8601(),
  body("vacationReason").optional().trim().isLength({ max: 500 }),
  body("serviceAreas").optional().isArray({ max: 20 }),
  body("serviceAreas.*").optional().trim().isLength({ min: 1, max: 100 }),
];

export const assignCategoriesValidation = [
  ...technicianIdParamValidation,
  body("skills")
    .optional()
    .isArray({ min: 1, max: 10 })
    .withMessage("skills must be an array of 1–10 items."),
  body("skills.*").optional().isIn(SERVICE_CATEGORIES),
  body("serviceCategories")
    .optional()
    .isArray({ min: 1, max: 10 }),
  body("serviceCategories.*").optional().isIn(SERVICE_CATEGORIES),
];

