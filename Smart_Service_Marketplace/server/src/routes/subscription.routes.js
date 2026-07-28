import express from "express";

import {
  listSubscriptionPlans,
  getCurrentSubscription,
  createProSubscription,
  verifySubscriptionPayment,
  cancelSubscription,
} from "../controllers/subscription.controller.js";

import {
  createSubscriptionValidation,
  verifySubscriptionValidation,
  cancelSubscriptionValidation,
} from "../validations/subscription.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.use(authenticate, authorize(ROLES.TECHNICIAN));

router.get("/plans", listSubscriptionPlans);
router.get("/current", getCurrentSubscription);
router.post(
  "/",
  createSubscriptionValidation,
  validate,
  createProSubscription
);
router.post(
  "/verify",
  verifySubscriptionValidation,
  validate,
  verifySubscriptionPayment
);
router.post(
  "/cancel",
  cancelSubscriptionValidation,
  validate,
  cancelSubscription
);

export default router;
