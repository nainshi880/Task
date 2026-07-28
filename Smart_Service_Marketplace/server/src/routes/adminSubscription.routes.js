import express from "express";

import {
  adminListPlans,
  adminUpsertPlan,
  adminSyncPlanToRazorpay,
  adminListSubscriptions,
  adminGetSubscriptionAnalytics,
  adminUpdateSubscriptionStatus,
} from "../controllers/adminSubscription.controller.js";

import {
  adminPlanIdValidation,
  adminSubscriptionIdValidation,
  adminUpsertPlanValidation,
  adminListSubscriptionsValidation,
  adminUpdateSubscriptionValidation,
} from "../validations/subscription.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get("/analytics", adminGetSubscriptionAnalytics);

router.get("/plans", adminListPlans);
router.post("/plans", adminUpsertPlanValidation, validate, adminUpsertPlan);
router.patch(
  "/plans/:planId",
  adminPlanIdValidation,
  adminUpsertPlanValidation,
  validate,
  adminUpsertPlan
);
router.post(
  "/plans/:planId/sync-razorpay",
  adminPlanIdValidation,
  validate,
  adminSyncPlanToRazorpay
);

router.get(
  "/",
  adminListSubscriptionsValidation,
  validate,
  adminListSubscriptions
);

router.patch(
  "/:subscriptionId",
  adminSubscriptionIdValidation,
  adminUpdateSubscriptionValidation,
  validate,
  adminUpdateSubscriptionStatus
);

export default router;
