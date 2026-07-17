import express from "express";

import {
  adminLogin,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  adminLogout,
  adminLogoutAllDevices,
  getAdminSessions,
} from "../controllers/admin.controller.js";

import {
  adminLoginValidation,
  adminProfileValidation,
  adminChangePasswordValidation,
} from "../validations/admin.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import { adminLoginLimiter } from "../middlewares/adminRateLimit.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/*
Public — Admin Login
*/
router.post(
  "/login",
  adminLoginLimiter,
  adminLoginValidation,
  validate,
  adminLogin
);

/*
Protected — Admin only (JWT + RBAC)
*/
router.use(authenticate, authorize(ROLES.ADMIN));

router.get("/profile", getAdminProfile);
router.put("/profile", adminProfileValidation, validate, updateAdminProfile);

router.put(
  "/change-password",
  adminChangePasswordValidation,
  validate,
  changeAdminPassword
);

router.post("/logout", adminLogout);
router.post("/logout-all", adminLogoutAllDevices);
router.get("/sessions", getAdminSessions);

export default router;
