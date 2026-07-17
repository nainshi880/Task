import express from "express";

import {
  register,
  login,
  logout,
  logoutAll,
  refresh,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
} from "../controllers/auth.controller.js";

import {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  refreshTokenValidation,
} from "../validations/auth.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import csrfProtection from "../middlewares/csrf.middleware.js";
import {
  authLoginLimiter,
  authRegisterLimiter,
  passwordResetLimiter,
  refreshTokenLimiter,
} from "../middlewares/rateLimit.middleware.js";

const router = express.Router();

router.post(
  "/register",
  authRegisterLimiter,
  registerValidation,
  validate,
  register
);

router.post(
  "/login",
  authLoginLimiter,
  loginValidation,
  validate,
  login
);

router.post(
  "/refresh",
  refreshTokenLimiter,
  csrfProtection,
  refreshTokenValidation,
  validate,
  refresh
);

router.post(
  "/logout",
  csrfProtection,
  logout
);

router.post("/logout-all", authenticate, csrfProtection, logoutAll);

router.get("/me", authenticate, getCurrentUser);

router.post(
  "/forgot-password",
  passwordResetLimiter,
  forgotPasswordValidation,
  validate,
  forgotPassword
);

router.put(
  "/reset-password/:token",
  resetPasswordValidation,
  validate,
  resetPassword
);

router.post("/verify-email", authenticate, sendVerificationEmail);

router.get("/verify-email/:token", verifyEmail);

export default router;
