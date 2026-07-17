import express from "express";

import {
  getCustomerDashboardStatistics,
  getTechnicianDashboardStatistics,
  getAdminDashboardStatistics,
} from "../controllers/dashboardStatistics.controller.js";

import { adminDashboardStatisticsValidation } from "../validations/dashboardStatistics.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.get(
  "/customer",
  authenticate,
  authorize(ROLES.CUSTOMER),
  getCustomerDashboardStatistics
);

router.get(
  "/technician",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  getTechnicianDashboardStatistics
);

router.get(
  "/admin",
  authenticate,
  authorize(ROLES.ADMIN),
  adminDashboardStatisticsValidation,
  validate,
  getAdminDashboardStatistics
);

export default router;
