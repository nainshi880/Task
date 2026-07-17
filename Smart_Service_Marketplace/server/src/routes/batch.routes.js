import express from "express";

import { executeBatch } from "../controllers/batch.controller.js";
import { batchRequestValidation } from "../validations/batch.validation.js";
import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  batchRequestValidation,
  validate,
  executeBatch
);

export default router;
