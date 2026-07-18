import { query, param } from "express-validator";
import SERVICE_CATEGORIES from "../constants/serviceCategory.js";

/** Treat missing / empty / whitespace query values as "not provided". */
const optionalQuery = (field) =>
  query(field).optional({ values: "falsy" }).trim();

export const listServicesValidation = [
  optionalQuery("q").isLength({ max: 100 }),
  optionalQuery("search").isLength({ max: 100 }),
  optionalQuery("category")
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid service category."),
  optionalQuery("serviceCategory")
    .isIn(SERVICE_CATEGORIES)
    .withMessage("Invalid service category."),
  optionalQuery("popular").isIn(["true", "false", "1", "0"]),
  optionalQuery("sortBy").isIn([
    "sortOrder",
    "name",
    "basePrice",
    "rating",
    "bookingCount",
    "createdAt",
  ]),
  optionalQuery("sortOrder").isIn(["asc", "desc"]),
  optionalQuery("page").isInt({ min: 1 }).toInt(),
  optionalQuery("limit").isInt({ min: 1, max: 50 }).toInt(),
];

export const serviceIdValidation = [
  param("serviceId").trim().notEmpty().withMessage("Service id is required."),
];
