import { query } from "express-validator";

export const adminDashboardStatisticsValidation = [
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("fromDate").optional().isISO8601(),
  query("toDate").optional().isISO8601(),
];
