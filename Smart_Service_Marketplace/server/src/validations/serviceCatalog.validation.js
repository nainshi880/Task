import { query, param } from "express-validator";
import SERVICE_CATEGORIES from "../constants/serviceCategory.js";

export const listServicesValidation = [
  query("q").optional().trim().isLength({ max: 100 }),
  query("search").optional().trim().isLength({ max: 100 }),
  query("category")
    .optional()
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid service category."),
  query("serviceCategory")
    .optional()
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid service category."),
  query("popular").optional().isIn(["true", "false", "1", "0"]),
  query("sortBy")
    .optional()
    .isIn([
      "sortOrder",
      "name",
      "basePrice",
      "rating",
      "bookingCount",
      "createdAt",
    ]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
];

export const serviceIdValidation = [
  param("serviceId").trim().notEmpty().withMessage("Service id is required."),
];
