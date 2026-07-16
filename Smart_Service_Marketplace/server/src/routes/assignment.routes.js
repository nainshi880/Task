import express from "express";

import {
  autoAssignTechnician,
  manualAssignTechnician,
  previewAutoAssignment,
  getAssignmentHistory,
} from "../controllers/assignment.controller.js";

import {
  bookingIdParamValidation,
  manualAssignValidation,
} from "../validations/assignment.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/*
=====================================
Admin — Technician Assignment
=====================================
*/

router.get(
  "/:bookingId/assign/preview",
  authenticate,
  authorize(ROLES.ADMIN),
  bookingIdParamValidation,
  validate,
  previewAutoAssignment
);

router.post(
  "/:bookingId/assign/auto",
  authenticate,
  authorize(ROLES.ADMIN),
  bookingIdParamValidation,
  validate,
  autoAssignTechnician
);

router.post(
  "/:bookingId/assign",
  authenticate,
  authorize(ROLES.ADMIN),
  manualAssignValidation,
  validate,
  manualAssignTechnician
);

router.get(
  "/:bookingId/assignment-history",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.CUSTOMER),
  bookingIdParamValidation,
  validate,
  getAssignmentHistory
);

export default router;
