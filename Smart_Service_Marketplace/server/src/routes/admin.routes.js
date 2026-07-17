import express from "express";

import {
  adminLogin,
  adminRefresh,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  adminLogout,
  adminLogoutAllDevices,
  getAdminSessions,
  createAdminAccount,
  listAdminAccounts,
} from "../controllers/admin.controller.js";

import {
  adminLoginValidation,
  adminProfileValidation,
  adminChangePasswordValidation,
  createAdminValidation,
} from "../validations/admin.validation.js";
import { refreshTokenValidation } from "../validations/auth.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import csrfProtection from "../middlewares/csrf.middleware.js";
import { adminLoginLimiter } from "../middlewares/adminRateLimit.middleware.js";
import { refreshTokenLimiter } from "../middlewares/rateLimit.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.post(
  "/login",
  adminLoginLimiter,
  adminLoginValidation,
  validate,
  adminLogin
);

router.post(
  "/refresh",
  refreshTokenLimiter,
  csrfProtection,
  refreshTokenValidation,
  validate,
  adminRefresh
);

router.use(authenticate, authorize(ROLES.ADMIN));

router.get("/profile", getAdminProfile);
router.put("/profile", adminProfileValidation, validate, updateAdminProfile);

router.put(
  "/change-password",
  adminChangePasswordValidation,
  validate,
  changeAdminPassword
);

router.post("/logout", csrfProtection, adminLogout);
router.post("/logout-all", csrfProtection, adminLogoutAllDevices);
router.get("/sessions", getAdminSessions);

/* Super Admin only — no public admin registration */
router.get("/admins", authorize(ROLES.SUPER_ADMIN), listAdminAccounts);
router.post(
  "/admins",
  authorize(ROLES.SUPER_ADMIN),
  createAdminValidation,
  validate,
  createAdminAccount
);

export default router;
