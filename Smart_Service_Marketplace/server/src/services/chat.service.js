import fs from "fs";
import chatRepository from "../repositories/chat.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import PAGINATION from "../constants/pagination.js";
import { MESSAGE_TYPE, DELIVERY_STATUS } from "../constants/chat.js";
import ROLES, { isAdminRole } from "../constants/roles.js";
import cloudinary from "../config/cloudinary.js";
import withRetry, { isTransientError } from "../utils/retry.js";
import {
  encryptMessage,
  decryptMessage,
  isChatEncryptionEnabled,
} from "../utils/messageCrypto.js";
import {
  queueChatOfflineNotification,
} from "./notificationQueue.service.js";
import NOTIFICATION_TYPES from "../constants/notificationType.js";
import { isUserOnline } from "../sockets/presence.js";

class ChatService {
  assertParticipant(room, userId) {
    const customerId = room.customer._id || room.customer;
    const technicianId = room.technician._id || room.technician;

    const isCustomer = customerId.toString() === userId.toString();
    const isTechnician = technicianId.toString() === userId.toString();

    if (!isCustomer && !isTechnician) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You are not a participant of this chat room."
      );
    }

    return {
      isCustomer,
      isTechnician,
      peerId: isCustomer ? technicianId : customerId,
    };
  }

  formatMessage(message) {
    const obj = message.toObject ? message.toObject() : { ...message };
    if (obj.content) {
      obj.content = decryptMessage(obj.content);
    }
    // Never expose search index to clients
    delete obj.searchText;
    return obj;
  }

  formatMessages(items = []) {
    return items.map((m) => this.formatMessage(m));
  }

  // ======================================
  // Rooms
  // ======================================

  /**
   * Create a chat room for an assigned booking, or sync the technician
   * when the booking was reassigned. Safe to call from assignment flows.
   */
  async ensureRoomForBooking(bookingId) {
    const booking = await chatRepository.findBookingById(bookingId);

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    if (!booking.technician) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Chat is available only after a technician is assigned."
      );
    }

    const customerId = booking.customer._id || booking.customer;
    const technicianId = booking.technician._id || booking.technician;

    let room = await chatRepository.findRoomByBooking(bookingId);

    if (!room) {
      room = await chatRepository.createRoom({
        booking: booking._id,
        customer: customerId,
        technician: technicianId,
      });
      return chatRepository.findRoomById(room._id);
    }

    const roomTechId = (room.technician._id || room.technician).toString();
    if (roomTechId !== technicianId.toString()) {
      await chatRepository.updateRoom(room._id, {
        technician: technicianId,
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
      });
      room = await chatRepository.findRoomById(room._id);
    }

    return room;
  }

  async getOrCreateRoomForBooking(user, bookingId) {
    const booking = await chatRepository.findBookingById(bookingId);

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    if (!booking.technician) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Chat is available only after a technician is assigned."
      );
    }

    const customerId = booking.customer._id || booking.customer;
    const technicianId = booking.technician._id || booking.technician;
    const userId = user._id.toString();

    const isCustomer = customerId.toString() === userId;
    const isTechnician = technicianId.toString() === userId;
    const isAdmin = isAdminRole(user.role);

    if (!isCustomer && !isTechnician && !isAdmin) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You cannot access chat for this booking."
      );
    }

    return this.ensureRoomForBooking(bookingId);
  }

  async listRooms(user, query = {}) {
    const page = Number(query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(
      Number(query.limit) || PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MAX_LIMIT
    );

    const role =
      user.role === ROLES.TECHNICIAN ? "technician" : "customer";

    const archived =
      query.archived === true ||
      query.archived === "true" ||
      query.archived === "1";

    const { items, total } = await chatRepository.listRoomsForUser(
      user._id,
      role,
      { page, limit, archived }
    );

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: page * limit < total,
      },
    };
  }

  async getRoom(user, roomId) {
    const room = await chatRepository.findRoomById(roomId);
    if (!room) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Chat room not found.");
    }

    if (!isAdminRole(user.role)) {
      this.assertParticipant(room, user._id);
    }

    return room;
  }

  async archiveRoom(user, roomId) {
    const room = await this.getRoom(user, roomId);
    if (!isAdminRole(user.role)) {
      this.assertParticipant(room, user._id);
    }

    if (room.isArchived) {
      return room;
    }

    return await chatRepository.archiveRoom(room._id, user._id);
  }

  async unarchiveRoom(user, roomId) {
    const room = await this.getRoom(user, roomId);
    if (!isAdminRole(user.role)) {
      this.assertParticipant(room, user._id);
    }

    if (!room.isArchived) {
      return room;
    }

    return await chatRepository.unarchiveRoom(room._id);
  }

  // ======================================
  // Messages
  // ======================================

  async getMessages(user, roomId, query = {}) {
    const room = await this.getRoom(user, roomId);

    const page = Number(query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(Number(query.limit) || 50, 100);

    const { items, total, hasMore, nextCursor, prevCursor } =
      await chatRepository.listMessages(room._id, {
        page,
        limit,
        before: query.before,
        after: query.after,
        cursor: query.cursor,
      });

    return {
      roomId: room._id,
      items: this.formatMessages(items),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore,
        nextCursor,
        prevCursor,
      },
    };
  }

  async searchMessages(user, roomId, query = {}) {
    const room = await this.getRoom(user, roomId);
    const q = (query.q || query.query || "").trim();

    if (!q) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Search query (q) is required."
      );
    }

    const page = Number(query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(
      Number(query.limit) || PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MAX_LIMIT
    );

    const { items, total } = await chatRepository.searchMessages(
      room._id,
      q,
      { page, limit }
    );

    return {
      roomId: room._id,
      query: q,
      items: this.formatMessages(items),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: page * limit < total,
      },
    };
  }

  async searchAllMessages(user, query = {}) {
    const q = (query.q || query.query || "").trim();

    if (!q) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Search query (q) is required."
      );
    }

    const page = Number(query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(
      Number(query.limit) || PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MAX_LIMIT
    );

    const role =
      user.role === ROLES.TECHNICIAN ? "technician" : "customer";

    const { items, total } = await chatRepository.searchAcrossRooms(
      user._id,
      role,
      q,
      { page, limit }
    );

    return {
      query: q,
      items: this.formatMessages(items),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: page * limit < total,
      },
    };
  }

  async sendMessage(user, roomId, payload, io = null) {
    const room = await this.getRoom(user, roomId);

    if (room.isArchived) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "This conversation is archived. Unarchive it to send messages."
      );
    }

    const { isCustomer, peerId } = this.assertParticipant(room, user._id);

    const type = payload.type || MESSAGE_TYPE.TEXT;
    const content = (payload.content || "").trim();
    const attachments = payload.attachments || [];

    if (type === MESSAGE_TYPE.TEXT && !content) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Message content is required."
      );
    }

    if (
      (type === MESSAGE_TYPE.IMAGE || type === MESSAGE_TYPE.FILE) &&
      !attachments.length
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Attachment is required for image/file messages."
      );
    }

    const shouldEncrypt =
      type === MESSAGE_TYPE.TEXT && content && isChatEncryptionEnabled();

    const storedContent = shouldEncrypt ? encryptMessage(content) : content;

    const message = await chatRepository.createMessage({
      room: room._id,
      booking: room.booking._id || room.booking,
      sender: user._id,
      senderRole: user.role,
      type,
      content: storedContent,
      searchText: content ? content.toLowerCase().slice(0, 4000) : "",
      isEncrypted: Boolean(shouldEncrypt),
      attachments,
      deliveryStatus: DELIVERY_STATUS.SENT,
    });

    const populated = await chatRepository.findMessageById(message._id);

    const preview =
      type === MESSAGE_TYPE.TEXT
        ? content.slice(0, 200)
        : type === MESSAGE_TYPE.IMAGE
          ? "📷 Image"
          : "📎 File";

    const roomUpdate = {
      $set: {
        lastMessageAt: new Date(),
        lastMessagePreview: preview,
      },
      $inc: {},
    };

    if (isCustomer) {
      roomUpdate.$set.customerUnreadCount = 0;
      roomUpdate.$inc.technicianUnreadCount = 1;
    } else {
      roomUpdate.$set.technicianUnreadCount = 0;
      roomUpdate.$inc.customerUnreadCount = 1;
    }

    await chatRepository.updateRoom(room._id, roomUpdate);

    const formatted = this.formatMessage(populated);

    // Offline peer → queue in-app notification
    if (!isUserOnline(peerId)) {
      const notifPayload = {
        userId: peerId,
        title: "New chat message",
        message:
          type === MESSAGE_TYPE.TEXT
            ? `${user.name}: ${content.slice(0, 80)}`
            : `${user.name} sent a ${type}`,
        type: NOTIFICATION_TYPES.CHAT,
        bookingId: room.booking._id || room.booking,
        actionUrl: `/chat/${room._id}`,
        metadata: {
          roomId: room._id.toString(),
          messageId: message._id.toString(),
        },
        jobId: `chat-msg-${message._id}`,
      };

      await queueChatOfflineNotification(notifPayload);
    }

    if (io) {
      io.to(`room:${room._id}`).emit("chat:message:new", {
        message: formatted,
      });

      io.to(`user:${peerId}`).emit("chat:message:new", {
        message: formatted,
        roomId: room._id,
      });
    }

    return formatted;
  }

  async uploadAndSend(user, roomId, files = [], { content, type } = {}, io = null) {
    if (!files.length) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "No files uploaded.");
    }

    const attachments = [];

    for (const file of files) {
      try {
        const isImage = (file.mimetype || "").startsWith("image/");
        const result = await withRetry(
          () =>
            cloudinary.uploader.upload(file.path, {
              folder: "chat-attachments",
              resource_type: isImage ? "image" : "auto",
            }),
          { retries: 2, delayMs: 400, shouldRetry: isTransientError }
        );

        attachments.push({
          url: result.secure_url,
          publicId: result.public_id,
          fileName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          resourceType: isImage ? "image" : "raw",
        });
      } finally {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    const messageType =
      type ||
      (attachments.every((a) => a.resourceType === "image")
        ? MESSAGE_TYPE.IMAGE
        : MESSAGE_TYPE.FILE);

    return await this.sendMessage(
      user,
      roomId,
      {
        type: messageType,
        content: content || "",
        attachments,
      },
      io
    );
  }

  async markMessageDelivered(user, messageId, io = null) {
    const message = await chatRepository.findMessageById(messageId);
    if (!message) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Message not found.");
    }

    const room = await chatRepository.findRoomById(message.room._id || message.room);
    this.assertParticipant(room, user._id);

    if (message.sender.toString() === user._id.toString()) {
      return this.formatMessage(message);
    }

    const updated = await chatRepository.markDelivered(messageId, user._id);

    if (io) {
      io.to(`room:${room._id}`).emit("chat:message:delivered", {
        messageId: updated._id,
        deliveryStatus: updated.deliveryStatus,
        deliveredTo: updated.deliveredTo,
      });
    }

    return this.formatMessage(updated);
  }

  async markMessageRead(user, messageId, io = null) {
    const message = await chatRepository.findMessageById(messageId);
    if (!message) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Message not found.");
    }

    const room = await chatRepository.findRoomById(
      message.room._id || message.room
    );
    const { isCustomer } = this.assertParticipant(room, user._id);

    if (message.sender.toString() === user._id.toString()) {
      return this.formatMessage(message);
    }

    const updated = await chatRepository.markRead(messageId, user._id);

    await chatRepository.updateRoom(room._id, {
      ...(isCustomer
        ? { customerUnreadCount: 0 }
        : { technicianUnreadCount: 0 }),
    });

    if (io) {
      io.to(`room:${room._id}`).emit("chat:message:read", {
        messageId: updated._id,
        deliveryStatus: updated.deliveryStatus,
        readBy: updated.readBy,
        readerId: user._id,
      });
    }

    return this.formatMessage(updated);
  }

  async markRoomRead(user, roomId, io = null) {
    const room = await this.getRoom(user, roomId);
    const { isCustomer } = this.assertParticipant(room, user._id);

    const updatedIds = await chatRepository.markRoomMessagesRead(
      room._id,
      user._id
    );

    await chatRepository.updateRoom(room._id, {
      ...(isCustomer
        ? { customerUnreadCount: 0 }
        : { technicianUnreadCount: 0 }),
    });

    if (io && updatedIds.length) {
      io.to(`room:${room._id}`).emit("chat:message:read", {
        roomId: room._id,
        messageIds: updatedIds,
        readerId: user._id,
        deliveryStatus: DELIVERY_STATUS.READ,
      });
    }

    return { roomId: room._id, readCount: updatedIds.length };
  }

  async deleteMessage(user, messageId, io = null) {
    const message = await chatRepository.softDeleteMessage(
      messageId,
      user._id
    );

    if (!message) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Message not found or you cannot delete it."
      );
    }

    if (io) {
      io.to(`room:${message.room}`).emit("chat:message:deleted", {
        messageId: message._id,
        roomId: message.room,
      });
    }

    return message;
  }
}

export default new ChatService();
