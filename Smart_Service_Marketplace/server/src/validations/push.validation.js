import { body, param } from "express-validator";
import { DEVICE_PLATFORM, PUSH_PROVIDER } from "../constants/push.js";

export const registerDeviceValidation = [
  body("token")
    .trim()
    .notEmpty()
    .withMessage("token is required.")
    .isLength({ min: 10, max: 512 }),

  body("provider")
    .optional()
    .isIn(Object.values(PUSH_PROVIDER))
    .withMessage("provider must be fcm or onesignal."),

  body("platform")
    .optional()
    .isIn(Object.values(DEVICE_PLATFORM))
    .withMessage("Invalid platform."),

  body("deviceId").optional().trim().isLength({ max: 120 }),
  body("deviceName").optional().trim().isLength({ max: 120 }),
  body("appVersion").optional().trim().isLength({ max: 40 }),
];

export const deviceTokenParamValidation = [
  param("token")
    .trim()
    .notEmpty()
    .withMessage("token is required."),
];

export const testPushValidation = [
  body("title").optional().trim().isLength({ max: 120 }),
  body("body").optional().trim().isLength({ max: 500 }),
];
