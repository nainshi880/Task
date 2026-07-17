import { body } from "express-validator";
import PAGINATION from "../constants/pagination.js";

export const batchRequestValidation = [
  body("requests")
    .isArray({ min: 1, max: PAGINATION.BATCH_MAX_REQUESTS })
    .withMessage(
      `requests must contain 1 to ${PAGINATION.BATCH_MAX_REQUESTS} items.`
    ),

  body("requests.*.resource")
    .trim()
    .notEmpty()
    .isIn(["bookings", "notifications", "payments", "wallet"])
    .withMessage("Invalid batch resource."),

  body("requests.*.id").optional().trim().isLength({ max: 50 }),

  body("requests.*.query").optional().isObject(),
];
