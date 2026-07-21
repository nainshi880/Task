import { body, param, query } from "express-validator";
import PAGINATION from "../constants/pagination.js";
import NOTIFICATION_TYPES from "../constants/notificationType.js";

export const listNotificationsValidation = [
  query("type")
    .optional()
    .isIn(Object.values(NOTIFICATION_TYPES))
    .withMessage("Invalid notification type."),

  query("isRead")
    .optional()
    .isIn(["true", "false"]),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: PAGINATION.MIN_LIMIT, max: PAGINATION.MAX_LIMIT })
    .toInt(),
];

export const notificationIdValidation = [
  param("notificationId")
    .isMongoId()
    .withMessage("Invalid notification ID."),
];

export const deleteNotificationsValidation = [
  query("onlyRead")
    .optional()
    .isIn(["true", "false"]),
];

export const notificationPreferencesValidation = [
  body("emailNotification").optional().isBoolean().toBoolean(),
  body("pushNotification").optional().isBoolean().toBoolean(),
  body("whatsappNotification").optional().isBoolean().toBoolean(),
  body("inAppNotification").optional().isBoolean().toBoolean(),
  body("bookingNotifications").optional().isBoolean().toBoolean(),
  body("paymentNotifications").optional().isBoolean().toBoolean(),
  body("systemNotifications").optional().isBoolean().toBoolean(),
  body("promotionalNotifications").optional().isBoolean().toBoolean(),
];

export const broadcastNotificationValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("title is required.")
    .isLength({ max: 200 }),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("message is required.")
    .isLength({ max: 2000 }),

  body("type")
    .optional()
    .isIn([NOTIFICATION_TYPES.PROMOTION, NOTIFICATION_TYPES.SYSTEM])
    .withMessage("type must be Promotion or System."),

  body("actionUrl")
    .optional()
    .trim()
    .isLength({ max: 500 }),

  body("city")
    .optional()
    .trim()
    .isLength({ max: 100 }),
];
