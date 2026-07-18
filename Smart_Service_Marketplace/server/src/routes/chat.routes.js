import express from "express";

import {
  listChatRooms,
  getOrCreateBookingRoom,
  getChatRoom,
  getChatMessages,
  searchChatMessages,
  searchAllChatMessages,
  archiveChatRoom,
  unarchiveChatRoom,
  sendChatMessage,
  uploadChatAttachment,
  markMessageRead,
  markRoomRead,
  markMessageDelivered,
  deleteChatMessage,
  getUserOnlineStatus,
} from "../controllers/chat.controller.js";

import {
  bookingIdParamValidation,
  roomIdParamValidation,
  messageIdParamValidation,
  userIdParamValidation,
  listRoomsValidation,
  listMessagesValidation,
  searchMessagesValidation,
  sendMessageValidation,
} from "../validations/chat.validation.js";

import { uploadChatAttachments } from "../middlewares/upload.middleware.js";
import {
  chatMessageLimiter,
  chatSearchLimiter,
  chatReadLimiter,
} from "../middlewares/chatRateLimit.middleware.js";
import validate from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/role.middleware.js";
import ROLES from "../constants/roles.js";

const router = express.Router();

const chatRoles = [
  ROLES.CUSTOMER,
  ROLES.TECHNICIAN,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
];

router.get(
  "/rooms",
  authenticate,
  authorize(...chatRoles),
  chatReadLimiter,
  listRoomsValidation,
  validate,
  listChatRooms
);

router.get(
  "/search",
  authenticate,
  authorize(...chatRoles),
  chatSearchLimiter,
  searchMessagesValidation,
  validate,
  searchAllChatMessages
);

router.get(
  "/rooms/booking/:bookingId",
  authenticate,
  authorize(...chatRoles),
  bookingIdParamValidation,
  validate,
  getOrCreateBookingRoom
);

router.get(
  "/rooms/:roomId",
  authenticate,
  authorize(...chatRoles),
  roomIdParamValidation,
  validate,
  getChatRoom
);

router.get(
  "/rooms/:roomId/messages",
  authenticate,
  authorize(...chatRoles),
  chatReadLimiter,
  listMessagesValidation,
  validate,
  getChatMessages
);

router.get(
  "/rooms/:roomId/search",
  authenticate,
  authorize(...chatRoles),
  chatSearchLimiter,
  roomIdParamValidation,
  searchMessagesValidation,
  validate,
  searchChatMessages
);

router.post(
  "/rooms/:roomId/messages",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN),
  chatMessageLimiter,
  sendMessageValidation,
  validate,
  sendChatMessage
);

router.post(
  "/rooms/:roomId/attachments",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN),
  chatMessageLimiter,
  roomIdParamValidation,
  validate,
  uploadChatAttachments,
  uploadChatAttachment
);

router.patch(
  "/rooms/:roomId/archive",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  roomIdParamValidation,
  validate,
  archiveChatRoom
);

router.patch(
  "/rooms/:roomId/unarchive",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN, ROLES.ADMIN),
  roomIdParamValidation,
  validate,
  unarchiveChatRoom
);

router.patch(
  "/rooms/:roomId/read",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN),
  roomIdParamValidation,
  validate,
  markRoomRead
);

router.patch(
  "/messages/:messageId/delivered",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN),
  messageIdParamValidation,
  validate,
  markMessageDelivered
);

router.patch(
  "/messages/:messageId/read",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN),
  messageIdParamValidation,
  validate,
  markMessageRead
);

router.delete(
  "/messages/:messageId",
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.TECHNICIAN),
  messageIdParamValidation,
  validate,
  deleteChatMessage
);

router.get(
  "/presence/:userId",
  authenticate,
  authorize(...chatRoles),
  userIdParamValidation,
  validate,
  getUserOnlineStatus
);

export default router;
