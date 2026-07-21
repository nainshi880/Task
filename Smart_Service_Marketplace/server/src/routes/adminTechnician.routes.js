import express from "express";

import {
  listAdminTechnicians,
  listPendingApplications,
  getAdminTechnicianDetails,
  verifyTechnician,
  approveTechnicianApplication,
  rejectTechnicianApplication,
  suspendTechnician,
  unsuspendTechnician,
  updateTechnicianAvailability,
  getTechnicianRatings,
  assignTechnicianCategories,
} from "../controllers/adminTechnician.controller.js";

import {
  technicianIdParamValidation,
  adminTechnicianListValidation,
  rejectApplicationValidation,
  suspendTechnicianValidation,
  adminAvailabilityValidation,
  assignCategoriesValidation,
} from "../validations/adminTechnician.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get("/", adminTechnicianListValidation, validate, listAdminTechnicians);

router.get(
  "/applications/pending",
  adminTechnicianListValidation,
  validate,
  listPendingApplications
);

router.get(
  "/:technicianId",
  technicianIdParamValidation,
  validate,
  getAdminTechnicianDetails
);

router.patch(
  "/:technicianId/verify",
  technicianIdParamValidation,
  validate,
  verifyTechnician
);

router.patch(
  "/:technicianId/approve",
  technicianIdParamValidation,
  validate,
  approveTechnicianApplication
);

router.patch(
  "/:technicianId/reject",
  rejectApplicationValidation,
  validate,
  rejectTechnicianApplication
);

router.patch(
  "/:technicianId/suspend",
  suspendTechnicianValidation,
  validate,
  suspendTechnician
);

router.patch(
  "/:technicianId/unsuspend",
  technicianIdParamValidation,
  validate,
  unsuspendTechnician
);

router.put(
  "/:technicianId/availability",
  adminAvailabilityValidation,
  validate,
  updateTechnicianAvailability
);

router.get(
  "/:technicianId/ratings",
  technicianIdParamValidation,
  validate,
  getTechnicianRatings
);

router.put(
  "/:technicianId/categories",
  assignCategoriesValidation,
  validate,
  assignTechnicianCategories
);

export default router;
