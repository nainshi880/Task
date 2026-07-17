import express from "express";

import {
  getBookingReports,
  getRevenueReports,
  getPaymentReports,
  getMonthlyReports,
} from "../controllers/adminReports.controller.js";

import {
  adminReportsQueryValidation,
  adminMonthlyReportsValidation,
} from "../validations/adminReports.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get(
  "/bookings",
  adminReportsQueryValidation,
  validate,
  getBookingReports
);

router.get(
  "/revenue",
  adminReportsQueryValidation,
  validate,
  getRevenueReports
);

router.get(
  "/payments",
  adminReportsQueryValidation,
  validate,
  getPaymentReports
);

router.get(
  "/monthly",
  adminMonthlyReportsValidation,
  validate,
  getMonthlyReports
);

router.get("/", adminMonthlyReportsValidation, validate, getMonthlyReports);

export default router;
