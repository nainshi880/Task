import express from "express";

import {
  register,
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
   verifyEmail
} from "../controllers/auth.controller.js";

import {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from "../validations/auth.validation.js";

import validate from "../middlewares/validation.middleware.js";

// Authentication Middleware 
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

/*

Public Routes

*/

// Register
router.post(
  "/register",
  registerValidation,
  validate,
  register
);

// Login
router.post(
  "/login",
  loginValidation,
  validate,
  login
);

// Logout
router.post(
  "/logout",
  authenticate,
  logout
);

// Current User
router.get(
  "/me",
  authenticate,
  getCurrentUser
);

// Forgot Password
router.post(

"/forgot-password",

forgotPasswordValidation,

validate,

forgotPassword

);

// Reset Password

router.put(

"/reset-password/:token",

resetPasswordValidation,

validate,

resetPassword

);

// Email Verification

router.post(

"/verify-email",

authenticate,

sendVerificationEmail

);

// Verify Email

router.get(

"/verify-email/:token",

verifyEmail

);

export default router;