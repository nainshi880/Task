import express from "express";

import {
  getAdminDashboardMetrics,
  getAdminGrowthCharts,
} from "../controllers/adminAnalytics.controller.js";

import {
  adminDashboardMetricsValidation,
  adminGrowthChartsValidation,
} from "../validations/adminAnalytics.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get(
  "/dashboard",
  adminDashboardMetricsValidation,
  validate,
  getAdminDashboardMetrics
);

router.get(
  "/growth",
  adminGrowthChartsValidation,
  validate,
  getAdminGrowthCharts
);

router.get(
  "/",
  adminDashboardMetricsValidation,
  validate,
  getAdminDashboardMetrics
);

export default router;
