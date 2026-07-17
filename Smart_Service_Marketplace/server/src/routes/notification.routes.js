import express from "express";

import {
  listNotifications,
  getUnreadCount,
  getNotification,
  markNotificationRead,
  markNotificationUnread,
  markAllNotificationsRead,
  deleteNotification,
  deleteNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  broadcastNotification,
} from "../controllers/notification.controller.js";

import {
  listNotificationsValidation,
  notificationIdValidation,
  deleteNotificationsValidation,
  notificationPreferencesValidation,
  broadcastNotificationValidation,
} from "../validations/notification.validation.js";

import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

/*
=====================================
Preferences
=====================================
*/

router.get(
  "/preferences",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  getNotificationPreferences
);

router.put(
  "/preferences",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  notificationPreferencesValidation,
  validate,
  updateNotificationPreferences
);

/*
=====================================
Admin — Broadcast
=====================================
*/

router.post(
  "/broadcast",
  authenticate,
  authorize(ROLES.ADMIN),
  broadcastNotificationValidation,
  validate,
  broadcastNotification
);

/*
=====================================
In-App Notifications
=====================================
*/

router.get(
  "/",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  listNotificationsValidation,
  validate,
  listNotifications
);

router.get(
  "/unread-count",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  getUnreadCount
);

router.patch(
  "/read-all",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  markAllNotificationsRead
);

router.delete(
  "/",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  deleteNotificationsValidation,
  validate,
  deleteNotifications
);

router.get(
  "/:notificationId",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  notificationIdValidation,
  validate,
  getNotification
);

router.patch(
  "/:notificationId/read",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  notificationIdValidation,
  validate,
  markNotificationRead
);

router.patch(
  "/:notificationId/unread",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  notificationIdValidation,
  validate,
  markNotificationUnread
);

router.delete(
  "/:notificationId",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  notificationIdValidation,
  validate,
  deleteNotification
);

export default router;
