import { body, param, query } from "express-validator";
import PAGINATION from "../constants/pagination.js";
import { MESSAGE_TYPE } from "../constants/chat.js";

export const bookingIdParamValidation = [
  param("bookingId").isMongoId().withMessage("Invalid booking ID."),
];

export const roomIdParamValidation = [
  param("roomId").isMongoId().withMessage("Invalid room ID."),
];

export const messageIdParamValidation = [
  param("messageId").isMongoId().withMessage("Invalid message ID."),
];

export const userIdParamValidation = [
  param("userId").isMongoId().withMessage("Invalid user ID."),
];

export const listRoomsValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit")
    .optional()
    .isInt({ min: PAGINATION.MIN_LIMIT, max: PAGINATION.MAX_LIMIT })
    .toInt(),
  query("archived").optional().isBoolean().toBoolean(),
];

export const listMessagesValidation = [
  param("roomId").isMongoId().withMessage("Invalid room ID."),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("before").optional().isISO8601(),
  query("after").optional().isISO8601(),
  query("cursor").optional().isISO8601(),
];

export const searchMessagesValidation = [
  param("roomId").optional().isMongoId().withMessage("Invalid room ID."),
  query("q")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Search query must be 1–200 characters."),
  query("query")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 }),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit")
    .optional()
    .isInt({ min: PAGINATION.MIN_LIMIT, max: PAGINATION.MAX_LIMIT })
    .toInt(),
];

export const sendMessageValidation = [
  param("roomId").isMongoId().withMessage("Invalid room ID."),
  body("content").optional().trim().isLength({ max: 4000 }),
  body("type")
    .optional()
    .isIn(Object.values(MESSAGE_TYPE))
    .withMessage("Invalid message type."),
  body("attachments").optional().isArray({ max: 5 }),
];
