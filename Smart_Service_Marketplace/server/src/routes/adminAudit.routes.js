import express from "express";

import { listAdminAuditLogs } from "../controllers/adminAudit.controller.js";
import { adminAuditLogsValidation } from "../validations/adminReports.validation.js";
import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get("/", adminAuditLogsValidation, validate, listAdminAuditLogs);

export default router;
