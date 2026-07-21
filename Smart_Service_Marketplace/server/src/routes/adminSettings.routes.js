import express from "express";

import {
  getAdminSettings,
  updateAdminSettings,
  updateAdminMaintenance,
  updateAdminTerms,
  updateAdminPrivacy,
  listAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
} from "../controllers/adminSettings.controller.js";

import {
  updatePlatformSettingsValidation,
  maintenanceSettingsValidation,
  legalDocumentValidation,
  createCategoryValidation,
  updateCategoryValidation,
  deleteCategoryValidation,
  listCategoriesValidation,
} from "../validations/adminSettings.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get("/", getAdminSettings);

router.put("/", updatePlatformSettingsValidation, validate, updateAdminSettings);

router.patch(
  "/maintenance",
  maintenanceSettingsValidation,
  validate,
  updateAdminMaintenance
);

router.put("/terms", legalDocumentValidation, validate, updateAdminTerms);

router.put("/privacy", legalDocumentValidation, validate, updateAdminPrivacy);

router.get("/categories", listCategoriesValidation, validate, listAdminCategories);

router.post("/categories", createCategoryValidation, validate, createAdminCategory);

router.patch(
  "/categories/:categoryId",
  updateCategoryValidation,
  validate,
  updateAdminCategory
);

router.delete(
  "/categories/:categoryId",
  deleteCategoryValidation,
  validate,
  deleteAdminCategory
);

export default router;
