import { query } from "express-validator";
import { analyticsQueryValidation } from "./payment.validation.js";

export const adminDashboardMetricsValidation = [...analyticsQueryValidation];

export const adminGrowthChartsValidation = [
  query("months")
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage("months must be between 1 and 24.")
    .toInt(),
];

export const adminMonthlyReportsValidation = [
  query("year")
    .optional()
    .isInt({ min: 2020, max: 2100 })
    .withMessage("Invalid year.")
    .toInt(),
  query("months")
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage("months must be between 1 and 24.")
    .toInt(),
];
