import express from "express";

import {
  registerDevice,
  unregisterDevice,
  listDevices,
  getPushProviders,
  sendTestPush,
  sendReviewReminder,
} from "../controllers/push.controller.js";

import {
  registerDeviceValidation,
  deviceTokenParamValidation,
  testPushValidation,
} from "../validations/push.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";
import { param } from "express-validator";

const router = express.Router();

router.get(
  "/providers",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.CUSTOMER, ROLES.TECHNICIAN),
  getPushProviders
);

router.get(
  "/devices",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  listDevices
);

router.post(
  "/devices",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  registerDeviceValidation,
  validate,
  registerDevice
);

router.delete(
  "/devices/:token",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  deviceTokenParamValidation,
  validate,
  unregisterDevice
);

router.post(
  "/test",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  testPushValidation,
  validate,
  sendTestPush
);

router.post(
  "/review-reminder/:bookingId",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  param("bookingId").isMongoId().withMessage("Invalid booking ID."),
  validate,
  sendReviewReminder
);

export default router;
