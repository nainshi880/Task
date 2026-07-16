import express from "express";

import {
  createProfile,
  getProfile,
  updateProfile,
  deleteProfile,
  uploadAvatar,
  
  deleteAvatar,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  getDashboard,
  getStatistics,
  getRecentBookings,
  getUpcomingBookings,
  getNotifications,
  changePassword,
  deactivateAccount,
  deleteAccount,
  logoutAllDevices,
  updatePreferences,
  getPreferences,
  updatePrivacy,
  getPrivacy,
  searchCustomers,
  filterCustomers,
  listCustomers,
} from "../controllers/customer.controller.js";

import {
  customerProfileValidation,
  changePasswordValidation,
  preferencesValidation,
  privacyValidation,
  customerSearchQueryValidation,
  customerFilterQueryValidation,
  customerListValidation,
} from "../validations/customer.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/*
=====================================
Admin — Search / Filter / Pagination
=====================================
*/

router.get(
  "/search",
  authenticate,
  authorize(ROLES.ADMIN),
  customerSearchQueryValidation,
  validate,
  searchCustomers
);

router.get(
  "/filter",
  authenticate,
  authorize(ROLES.ADMIN),
  customerFilterQueryValidation,
  validate,
  filterCustomers
);

router.get(
  "/list",
  authenticate,
  authorize(ROLES.ADMIN),
  customerListValidation,
  validate,
  listCustomers
);

/*
=====================================
Customer Profile
=====================================
*/

router.post(
  "/profile",
  authenticate,
  authorize(ROLES.CUSTOMER),
  customerProfileValidation,
  validate,
  createProfile
);

router.get(
  "/profile",
  authenticate,
  authorize(ROLES.CUSTOMER),
  getProfile
);

router.put(
  "/profile",
  authenticate,
  authorize(ROLES.CUSTOMER),
  customerProfileValidation,
  validate,
  updateProfile
);

router.delete(
  "/profile",
  authenticate,
  authorize(ROLES.CUSTOMER),
  deleteProfile
);

/*
=====================================
Avatar
=====================================
*/

router.patch(
  "/avatar",
  authenticate,
  authorize(ROLES.CUSTOMER),
  uploadAvatar
);

router.delete(
  "/avatar",
  authenticate,
  authorize(ROLES.CUSTOMER),
  deleteAvatar
);

/*
=====================================
Addresses
=====================================
*/

router.get(
  "/addresses",
  authenticate,
  authorize(ROLES.CUSTOMER),
  getAddresses
);

router.post(
  "/addresses",
  authenticate,
  authorize(ROLES.CUSTOMER),
  addAddress
);

router.put(
  "/addresses/:addressId",
  authenticate,
  authorize(ROLES.CUSTOMER),
  updateAddress
);

router.delete(
  "/addresses/:addressId",
  authenticate,
  authorize(ROLES.CUSTOMER),
  deleteAddress
);

/*
==================================================
Dashboard
==================================================
*/

router.get(
  "/dashboard",
  authenticate,
  authorize(ROLES.CUSTOMER),
  getDashboard
);

router.get(
  "/statistics",
  authenticate,
  authorize(ROLES.CUSTOMER),
  getStatistics
);

router.get(
  "/recent-bookings",
  authenticate,
  authorize(ROLES.CUSTOMER),
  getRecentBookings
);

router.get(
  "/upcoming-bookings",
  authenticate,
  authorize(ROLES.CUSTOMER),
  getUpcomingBookings
);

router.get(
  "/notifications",
  authenticate,
  authorize(ROLES.CUSTOMER),
  getNotifications
);

/*
====================================================
Account Settings
====================================================
*/

router.put(
  "/change-password",
  authenticate,
  authorize(ROLES.CUSTOMER),
  changePasswordValidation,
  validate,
  changePassword
);

router.patch(
  "/deactivate",
  authenticate,
  authorize(ROLES.CUSTOMER),
  deactivateAccount
);

router.delete(
  "/delete-account",
  authenticate,
  authorize(ROLES.CUSTOMER),
  deleteAccount
);

router.post(
  "/logout-all",
  authenticate,
  authorize(ROLES.CUSTOMER),
  logoutAllDevices
);

/*
====================================================
Notification Preferences
====================================================
*/

router.get(
  "/preferences",
  authenticate,
  authorize(ROLES.CUSTOMER),
  getPreferences
);

router.put(
  "/preferences",
  authenticate,
  authorize(ROLES.CUSTOMER),
  preferencesValidation,
  validate,
  updatePreferences
);

/*
====================================================
Privacy
====================================================
*/

router.get(
  "/privacy",
  authenticate,
  authorize(ROLES.CUSTOMER),
  getPrivacy
);

router.put(
  "/privacy",
  authenticate,
  authorize(ROLES.CUSTOMER),
  privacyValidation,
  validate,
  updatePrivacy
);

export default router;
