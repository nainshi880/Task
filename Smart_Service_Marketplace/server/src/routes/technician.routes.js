import express from "express";

import {
  updateMyAvailability,
  updateMySkills,
  getMyWorkload,
  getAvailableTechnicians,
} from "../controllers/assignment.controller.js";

import {
  updateAvailabilityValidation,
  updateSkillsValidation,
  availableTechniciansValidation,
} from "../validations/assignment.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/*
=====================================
Admin — Available Technicians
=====================================
*/

router.get(
  "/available",
  authenticate,
  authorize(ROLES.ADMIN),
  availableTechniciansValidation,
  validate,
  getAvailableTechnicians
);

/*
=====================================
Technician — Availability / Skills / Workload
=====================================
*/

router.get(
  "/me/workload",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  getMyWorkload
);

router.patch(
  "/me/availability",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  updateAvailabilityValidation,
  validate,
  updateMyAvailability
);

router.put(
  "/me/skills",
  authenticate,
  authorize(ROLES.TECHNICIAN),
  updateSkillsValidation,
  validate,
  updateMySkills
);

export default router;
