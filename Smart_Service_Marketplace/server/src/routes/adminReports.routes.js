import express from "express";

import { getAdminMonthlyReports } from "../controllers/adminAnalytics.controller.js";
import { adminMonthlyReportsValidation } from "../validations/adminAnalytics.validation.js";
import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get("/monthly", adminMonthlyReportsValidation, validate, getAdminMonthlyReports);

router.get("/", adminMonthlyReportsValidation, validate, getAdminMonthlyReports);

export default router;
