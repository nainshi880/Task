import express from "express";

import {
  sendOtp,
  verifyOtp,
  getMessagingProviders,
} from "../controllers/messaging.controller.js";

import {
  sendOtpValidation,
  verifyOtpValidation,
} from "../validations/messaging.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.get(
  "/providers",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.CUSTOMER, ROLES.TECHNICIAN),
  getMessagingProviders
);

router.post(
  "/otp/send",
  sendOtpValidation,
  validate,
  sendOtp
);

router.post(
  "/otp/verify",
  verifyOtpValidation,
  validate,
  verifyOtp
);

// Authenticated OTP (uses logged-in user id for preference/audit context)
router.post(
  "/otp/send-auth",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  sendOtpValidation,
  validate,
  sendOtp
);

export default router;
