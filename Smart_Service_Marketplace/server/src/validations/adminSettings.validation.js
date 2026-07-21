import { body, param, query } from "express-validator";
import ROLES from "../constants/roles.js";

const categoryIdParam = [
  param("categoryId").isMongoId().withMessage("Invalid category ID."),
];

const percentField = (field) =>
  body(field)
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage(`${field} must be between 0 and 100.`);

export const updatePlatformSettingsValidation = [
  body("platformName").optional().trim().isLength({ max: 150 }),
  body("supportEmail").optional().trim().isEmail(),
  body("supportPhone").optional().trim().isLength({ max: 20 }),
  body("currency").optional().trim().isLength({ min: 3, max: 3 }),
  percentField("commission.defaultPercent"),
  body("commission.minimumPayoutAmount")
    .optional()
    .isFloat({ min: 0 })
    .toFloat(),
  body("gst.defaultRate").optional().isFloat({ min: 0, max: 40 }).toFloat(),
  body("gst.companyName").optional().trim().isLength({ max: 200 }),
  body("gst.gstin").optional().trim().isLength({ max: 20 }),
  body("gst.address").optional().trim().isLength({ max: 500 }),
  body("gst.city").optional().trim().isLength({ max: 100 }),
  body("gst.state").optional().trim().isLength({ max: 100 }),
  body("gst.postalCode").optional().trim().isLength({ max: 20 }),
  body("gst.email").optional().trim().isEmail(),
  body("gst.phone").optional().trim().isLength({ max: 20 }),
  body("gst.pricesIncludeGst").optional().isBoolean().toBoolean(),
  percentField("fees.platformFeePercent"),
  body("fees.convenienceFeeFlat").optional().isFloat({ min: 0 }).toFloat(),
  body("fees.minimumBookingAmount").optional().isFloat({ min: 0 }).toFloat(),
  body("notifications.emailEnabled").optional().isBoolean().toBoolean(),
  body("notifications.pushEnabled").optional().isBoolean().toBoolean(),
  body("notifications.whatsappEnabled").optional().isBoolean().toBoolean(),
  body("notifications.bookingReminders").optional().isBoolean().toBoolean(),
  body("notifications.promotionalMessages").optional().isBoolean().toBoolean(),
];

export const maintenanceSettingsValidation = [
  body("enabled").optional().isBoolean().toBoolean(),
  body("message").optional().trim().isLength({ max: 500 }),
  body("allowedRoles").optional().isArray(),
  body("allowedRoles.*").optional().isIn(Object.values(ROLES)),
  body("scheduledStart").optional().isISO8601(),
  body("scheduledEnd").optional().isISO8601(),
];

export const legalDocumentValidation = [
  body("content").optional().isString().isLength({ max: 100000 }),
  body("version").optional().trim().isLength({ max: 20 }),
];

export const createCategoryValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required.")
    .isLength({ max: 100 }),
  body("description").optional().trim().isLength({ max: 500 }),
  body("iconUrl").optional({ values: "falsy" }).trim().isURL(),
  body("commissionPercent").optional().isFloat({ min: 0, max: 100 }).toFloat(),
  body("gstRate").optional().isFloat({ min: 0, max: 40 }).toFloat(),
  body("isActive").optional().isBoolean().toBoolean(),
  body("sortOrder").optional().isInt({ min: 0 }).toInt(),
];

export const updateCategoryValidation = [
  ...categoryIdParam,
  body("name").optional().trim().notEmpty().isLength({ max: 100 }),
  body("description").optional().trim().isLength({ max: 500 }),
  body("iconUrl").optional({ values: "falsy" }).trim().isURL(),
  body("commissionPercent").optional().isFloat({ min: 0, max: 100 }).toFloat(),
  body("gstRate").optional().isFloat({ min: 0, max: 40 }).toFloat(),
  body("isActive").optional().isBoolean().toBoolean(),
  body("sortOrder").optional().isInt({ min: 0 }).toInt(),
];

export const deleteCategoryValidation = [...categoryIdParam];

export const listCategoriesValidation = [
  query("includeInactive").optional().isBoolean().toBoolean(),
  query("q").optional().trim().isLength({ min: 1, max: 100 }),
  query("search").optional().trim().isLength({ min: 1, max: 100 }),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

