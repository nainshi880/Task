import express from "express";
import rateLimit from "express-rate-limit";

import {
  createPaymentOrder,
  verifyPayment,
  getPaymentStatus,
  getPaymentByBooking,
  listMyPayments,
  markPaymentFailed,
  retryPayment,
  processRefund,
  recoverPayment,
  listRecoverablePayments,
  listAdminPayments,
  getPaymentAnalytics,
  getPaymentAuditLogs,
  razorpayWebhook,
} from "../controllers/payment.controller.js";

import {
  createPaymentOrderValidation,
  verifyPaymentValidation,
  paymentFailureValidation,
  paymentIdValidation,
  bookingIdParamValidation,
  listPaymentsValidation,
  refundPaymentValidation,
  listAdminPaymentsValidation,
  analyticsQueryValidation,
  recoverablePaymentsValidation,
  auditLogsQueryValidation,
} from "../validations/payment.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many webhook requests. Please try again later.",
  },
});

/*
=====================================
Razorpay Webhook (no JWT — secured via signature)
=====================================
*/

router.post("/webhook", webhookLimiter, razorpayWebhook);

/*
=====================================
Admin — Analytics / Recovery / List / Refund
=====================================
*/

router.get(
  "/analytics/dashboard",
  authenticate,
  authorize(ROLES.ADMIN),
  analyticsQueryValidation,
  validate,
  getPaymentAnalytics
);

router.get(
  "/admin/list",
  authenticate,
  authorize(ROLES.ADMIN),
  listAdminPaymentsValidation,
  validate,
  listAdminPayments
);

router.get(
  "/admin/recoverable",
  authenticate,
  authorize(ROLES.ADMIN),
  recoverablePaymentsValidation,
  validate,
  listRecoverablePayments
);

router.post(
  "/:paymentId/recover",
  authenticate,
  authorize(ROLES.ADMIN),
  paymentIdValidation,
  validate,
  recoverPayment
);

router.post(
  "/:paymentId/refund",
  authenticate,
  authorize(ROLES.ADMIN),
  refundPaymentValidation,
  validate,
  processRefund
);

router.get(
  "/:paymentId/audit-logs",
  authenticate,
  authorize(ROLES.ADMIN),
  auditLogsQueryValidation,
  validate,
  getPaymentAuditLogs
);

/*
=====================================
Customer — Payments
=====================================
*/

router.post(
  "/orders",
  authenticate,
  authorize(ROLES.CUSTOMER),
  createPaymentOrderValidation,
  validate,
  createPaymentOrder
);

router.post(
  "/verify",
  authenticate,
  authorize(ROLES.CUSTOMER),
  verifyPaymentValidation,
  validate,
  verifyPayment
);

router.post(
  "/failure",
  authenticate,
  authorize(ROLES.CUSTOMER),
  paymentFailureValidation,
  validate,
  markPaymentFailed
);

router.post(
  "/:paymentId/retry",
  authenticate,
  authorize(ROLES.CUSTOMER),
  paymentIdValidation,
  validate,
  retryPayment
);

router.get(
  "/",
  authenticate,
  authorize(ROLES.CUSTOMER),
  listPaymentsValidation,
  validate,
  listMyPayments
);

router.get(
  "/:paymentId/status",
  authenticate,
  authorize(ROLES.CUSTOMER),
  paymentIdValidation,
  validate,
  getPaymentStatus
);

router.get(
  "/booking/:bookingId",
  authenticate,
  authorize(ROLES.CUSTOMER),
  bookingIdParamValidation,
  validate,
  getPaymentByBooking
);

export default router;
