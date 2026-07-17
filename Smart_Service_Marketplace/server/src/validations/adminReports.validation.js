import { query } from "express-validator";
import { analyticsQueryValidation } from "./payment.validation.js";
import AUDIT_ACTION from "../constants/auditAction.js";
import PAGINATION from "../constants/pagination.js";

export const adminReportsQueryValidation = [
  ...analyticsQueryValidation,
  query("fromDate").optional().isISO8601(),
  query("toDate").optional().isISO8601(),
  query("status").optional().trim().isLength({ max: 50 }),
  query("category").optional().trim().isLength({ max: 100 }),
  query("serviceCategory").optional().trim().isLength({ max: 100 }),
  query("format").optional().isIn(["json", "csv"]),
];

export const adminMonthlyReportsValidation = [
  query("year")
    .optional()
    .isInt({ min: 2020, max: 2100 })
    .toInt(),
  query("months")
    .optional()
    .isInt({ min: 1, max: 24 })
    .toInt(),
];

export const adminAuditLogsValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit")
    .optional()
    .isInt({ min: PAGINATION.MIN_LIMIT, max: PAGINATION.MAX_LIMIT })
    .toInt(),
  query("action")
    .optional()
    .isIn(Object.values(AUDIT_ACTION)),
  query("resource").optional().trim().isLength({ max: 100 }),
  query("actorId").optional().isMongoId(),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("fromDate").optional().isISO8601(),
  query("toDate").optional().isISO8601(),
];
