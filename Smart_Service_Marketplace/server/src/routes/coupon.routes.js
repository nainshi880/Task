import express from "express";

import {
  validateCoupon,
  applyCoupon,
  removeCoupon,
  getMyReferral,
  createCoupon,
  updateCoupon,
  getCoupon,
  listCoupons,
  deactivateCoupon,
} from "../controllers/coupon.controller.js";

import {
  validateCouponValidation,
  applyCouponValidation,
  bookingIdParamValidation,
  couponIdValidation,
  createCouponValidation,
  updateCouponValidation,
  listCouponsValidation,
} from "../validations/coupon.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/*
=====================================
Customer — Validate / Apply / Referral
=====================================
*/

router.post(
  "/validate",
  authenticate,
  authorize(ROLES.CUSTOMER),
  validateCouponValidation,
  validate,
  validateCoupon
);

router.post(
  "/apply",
  authenticate,
  authorize(ROLES.CUSTOMER),
  applyCouponValidation,
  validate,
  applyCoupon
);

router.delete(
  "/apply/:bookingId",
  authenticate,
  authorize(ROLES.CUSTOMER),
  bookingIdParamValidation,
  validate,
  removeCoupon
);

router.get(
  "/referral/me",
  authenticate,
  authorize(ROLES.CUSTOMER),
  getMyReferral
);

/*
=====================================
Admin — Coupon CRUD
=====================================
*/

router.post(
  "/",
  authenticate,
  authorize(ROLES.ADMIN),
  createCouponValidation,
  validate,
  createCoupon
);

router.get(
  "/",
  authenticate,
  authorize(ROLES.ADMIN),
  listCouponsValidation,
  validate,
  listCoupons
);

router.get(
  "/:couponId",
  authenticate,
  authorize(ROLES.ADMIN),
  couponIdValidation,
  validate,
  getCoupon
);

router.patch(
  "/:couponId",
  authenticate,
  authorize(ROLES.ADMIN),
  updateCouponValidation,
  validate,
  updateCoupon
);

router.post(
  "/:couponId/deactivate",
  authenticate,
  authorize(ROLES.ADMIN),
  couponIdValidation,
  validate,
  deactivateCoupon
);

export default router;
