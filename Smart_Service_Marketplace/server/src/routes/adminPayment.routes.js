import express from "express";

import {
  listAdminTransactions,
  getAdminTransactionDetails,
  getAdminPaymentReports,
  getAdminRevenueTracking,
  listAdminRefunds,
  processAdminRefund,
  listAdminFailedPayments,
  listAdminRecoverablePayments,
  recoverAdminPayment,
  listAdminTechnicianPayouts,
  processAdminTechnicianPayout,
} from "../controllers/adminPayment.controller.js";

import {
  adminTransactionListValidation,
  adminTransactionDetailsValidation,
  adminPaymentReportsValidation,
  adminRevenueValidation,
  adminRefundsListValidation,
  adminRefundProcessValidation,
  adminFailedPaymentsValidation,
  adminRecoverableListValidation,
  adminRecoverPaymentValidation,
  adminPayoutsListValidation,
  adminProcessPayoutValidation,
} from "../validations/adminPayment.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get("/reports", adminPaymentReportsValidation, validate, getAdminPaymentReports);

router.get("/revenue", adminRevenueValidation, validate, getAdminRevenueTracking);

router.get("/transactions", adminTransactionListValidation, validate, listAdminTransactions);

router.get("/refunds", adminRefundsListValidation, validate, listAdminRefunds);

router.get(
  "/failed/recoverable",
  adminRecoverableListValidation,
  validate,
  listAdminRecoverablePayments
);

router.get("/failed", adminFailedPaymentsValidation, validate, listAdminFailedPayments);

router.get("/payouts", adminPayoutsListValidation, validate, listAdminTechnicianPayouts);

router.patch(
  "/payouts/:payoutId",
  adminProcessPayoutValidation,
  validate,
  processAdminTechnicianPayout
);

router.get(
  "/transactions/:paymentId",
  adminTransactionDetailsValidation,
  validate,
  getAdminTransactionDetails
);

router.post(
  "/transactions/:paymentId/refund",
  adminRefundProcessValidation,
  validate,
  processAdminRefund
);

router.post(
  "/transactions/:paymentId/recover",
  adminRecoverPaymentValidation,
  validate,
  recoverAdminPayment
);

export default router;
