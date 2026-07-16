import express from "express";

import {
  getWallet,
  getWalletBalance,
  listWalletTransactions,
  getWalletHistory,
  createWalletRecharge,
  verifyWalletRecharge,
  payBookingWithWallet,
  refundToWallet,
} from "../controllers/wallet.controller.js";

import {
  rechargeWalletValidation,
  verifyRechargeValidation,
  walletPayValidation,
  walletRefundValidation,
  listWalletTransactionsValidation,
} from "../validations/wallet.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/*
=====================================
Customer — Wallet
=====================================
*/

router.get(
  "/",
  authenticate,
  authorize(ROLES.CUSTOMER),
  getWallet
);

router.get(
  "/balance",
  authenticate,
  authorize(ROLES.CUSTOMER),
  getWalletBalance
);

router.get(
  "/transactions",
  authenticate,
  authorize(ROLES.CUSTOMER),
  listWalletTransactionsValidation,
  validate,
  listWalletTransactions
);

router.get(
  "/history",
  authenticate,
  authorize(ROLES.CUSTOMER),
  listWalletTransactionsValidation,
  validate,
  getWalletHistory
);

router.post(
  "/recharge",
  authenticate,
  authorize(ROLES.CUSTOMER),
  rechargeWalletValidation,
  validate,
  createWalletRecharge
);

router.post(
  "/recharge/verify",
  authenticate,
  authorize(ROLES.CUSTOMER),
  verifyRechargeValidation,
  validate,
  verifyWalletRecharge
);

router.post(
  "/pay",
  authenticate,
  authorize(ROLES.CUSTOMER),
  walletPayValidation,
  validate,
  payBookingWithWallet
);

/*
=====================================
Customer / Admin — Wallet Refund
=====================================
*/

router.post(
  "/refund",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  walletRefundValidation,
  validate,
  refundToWallet
);

export default router;
