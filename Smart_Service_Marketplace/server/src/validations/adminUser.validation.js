import { param, query } from "express-validator";
import PAGINATION from "../constants/pagination.js";

export const userIdParamValidation = [
  param("userId").isMongoId().withMessage("Invalid user ID."),
];

export const adminUserPaginationValidation = [
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
      "lastProfileUpdated",
      "profileCompleted",
    ]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
];

export const adminUserSearchValidation = [
  ...adminUserPaginationValidation,
  query("q")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Search query must be 1–200 characters."),
  query("search")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 }),
];

export const adminUserFilterValidation = [
  ...adminUserPaginationValidation,
  query("city").optional().trim().isLength({ min: 1, max: 100 }),
  query("gender").optional().isIn(["Male", "Female", "Other"]),
  query("profileCompleted").optional().isIn(["true", "false"]),
  query("isActive").optional().isIn(["true", "false"]),
  query("isVerified").optional().isIn(["true", "false"]),
  query("includeDeleted").optional().isIn(["true", "false", "only"]),
];

export const adminUserActivityValidation = [
  ...userIdParamValidation,
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit")
    .optional()
    .isInt({ min: PAGINATION.MIN_LIMIT, max: PAGINATION.MAX_LIMIT })
    .toInt(),
];
