import ChatRoom from "../models/ChatRoom.js";
import ChatMessage from "../models/ChatMessage.js";
import Booking from "../models/Booking.js";
import { DELIVERY_STATUS } from "../constants/chat.js";

class ChatRepository {
  async findBookingById(bookingId) {
    return await Booking.findById(bookingId)
      .populate("customer", "name email role")
      .populate("technician", "name email role");
  }

  async findRoomByBooking(bookingId) {
    return await ChatRoom.findOne({ booking: bookingId })
      .populate("customer", "name email role avatar")
      .populate("technician", "name email role avatar")
      .populate("booking", "serviceName status bookingDate bookingTime");
  }

  async findRoomById(roomId) {
    return await ChatRoom.findById(roomId)
      .populate("customer", "name email role avatar")
      .populate("technician", "name email role avatar")
      .populate("booking", "serviceName status bookingDate bookingTime");
  }

  async createRoom(data) {
    return await ChatRoom.create(data);
  }

  async listRoomsForUser(
    userId,
    role,
    { page = 1, limit = 20, archived = false } = {}
  ) {
    const filter =
      role === "technician"
        ? { technician: userId, isActive: true }
        : { customer: userId, isActive: true };

    filter.isArchived = archived === true || archived === "true";

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ChatRoom.find(filter)
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customer", "name email avatar")
        .populate("technician", "name email avatar")
        .populate("booking", "serviceName status bookingDate bookingTime"),
      ChatRoom.countDocuments(filter),
    ]);

    return { items, total };
  }

  async updateRoom(roomId, update) {
    return await ChatRoom.findByIdAndUpdate(roomId, update, {
      new: true,
      runValidators: true,
    });
  }

  async archiveRoom(roomId, userId) {
    return await ChatRoom.findByIdAndUpdate(
      roomId,
      {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: userId,
      },
      { new: true }
    )
      .populate("customer", "name email avatar")
      .populate("technician", "name email avatar")
      .populate("booking", "serviceName status bookingDate bookingTime");
  }

  async unarchiveRoom(roomId) {
    return await ChatRoom.findByIdAndUpdate(
      roomId,
      {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
      },
      { new: true }
    )
      .populate("customer", "name email avatar")
      .populate("technician", "name email avatar")
      .populate("booking", "serviceName status bookingDate bookingTime");
  }

  async createMessage(data) {
    return await ChatMessage.create(data);
  }

  async findMessageById(messageId) {
    return await ChatMessage.findById(messageId)
      .populate("sender", "name email role avatar")
      .populate("room");
  }

  /**
   * Cursor pagination: prefer `before` (ISO date or message id timestamp)
   * and return hasMore / nextCursor.
   */
  async listMessages(
    roomId,
    { page = 1, limit = 50, before, after, cursor } = {}
  ) {
    const filter = {
      room: roomId,
      isDeleted: false,
    };

    const beforeValue = before || cursor;

    if (beforeValue) {
      const beforeDate = this._toDate(beforeValue);
      if (beforeDate) filter.createdAt = { ...(filter.createdAt || {}), $lt: beforeDate };
    }

    if (after) {
      const afterDate = this._toDate(after);
      if (afterDate) {
        filter.createdAt = { ...(filter.createdAt || {}), $gt: afterDate };
      }
    }

    const useCursor = Boolean(beforeValue || after);
    const skip = useCursor ? 0 : (page - 1) * limit;

    const [rawItems, total] = await Promise.all([
      ChatMessage.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit + 1)
        .populate("sender", "name email role avatar"),
      ChatMessage.countDocuments({ room: roomId, isDeleted: false }),
    ]);

    const hasMore = rawItems.length > limit;
    const pageItems = hasMore ? rawItems.slice(0, limit) : rawItems;
    const chronological = pageItems.reverse();

    const oldest = chronological[0];
    const newest = chronological[chronological.length - 1];

    return {
      items: chronological,
      total,
      hasMore,
      nextCursor: hasMore && oldest ? oldest.createdAt.toISOString() : null,
      prevCursor: newest ? newest.createdAt.toISOString() : null,
    };
  }

  async searchMessages(
    roomId,
    q,
    { page = 1, limit = 20 } = {}
  ) {
    const query = (q || "").trim();
    if (!query) {
      return { items: [], total: 0 };
    }

    const filter = {
      room: roomId,
      isDeleted: false,
      searchText: {
        $regex: this._escapeRegex(query),
        $options: "i",
      },
    };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ChatMessage.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "name email role avatar"),
      ChatMessage.countDocuments(filter),
    ]);

    return { items, total };
  }

  async searchAcrossRooms(userId, role, q, { page = 1, limit = 20 } = {}) {
    const query = (q || "").trim();
    if (!query) {
      return { items: [], total: 0 };
    }

    const roomFilter =
      role === "technician"
        ? { technician: userId, isActive: true }
        : { customer: userId, isActive: true };

    const rooms = await ChatRoom.find(roomFilter).select("_id");
    const roomIds = rooms.map((r) => r._id);

    if (!roomIds.length) {
      return { items: [], total: 0 };
    }

    const regexFilter = {
      room: { $in: roomIds },
      isDeleted: false,
      searchText: {
        $regex: this._escapeRegex(query),
        $options: "i",
      },
    };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ChatMessage.find(regexFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "name email role avatar")
        .populate("room", "booking customer technician"),
      ChatMessage.countDocuments(regexFilter),
    ]);

    return { items, total };
  }

  async markDelivered(messageId, userId) {
    const message = await ChatMessage.findById(messageId);
    if (!message || message.isDeleted) return null;

    const already = message.deliveredTo.some(
      (d) => d.user.toString() === userId.toString()
    );

    if (!already) {
      message.deliveredTo.push({ user: userId, at: new Date() });
    }

    if (
      message.deliveryStatus === DELIVERY_STATUS.SENT &&
      message.sender.toString() !== userId.toString()
    ) {
      message.deliveryStatus = DELIVERY_STATUS.DELIVERED;
    }

    await message.save();
    return message;
  }

  async markRead(messageId, userId) {
    const message = await ChatMessage.findById(messageId);
    if (!message || message.isDeleted) return null;

    const already = message.readBy.some(
      (r) => r.user.toString() === userId.toString()
    );

    if (!already) {
      message.readBy.push({ user: userId, at: new Date() });
    }

    if (message.sender.toString() !== userId.toString()) {
      message.deliveryStatus = DELIVERY_STATUS.READ;

      const alreadyDelivered = message.deliveredTo.some(
        (d) => d.user.toString() === userId.toString()
      );
      if (!alreadyDelivered) {
        message.deliveredTo.push({ user: userId, at: new Date() });
      }
    }

    await message.save();
    return message;
  }

  async markRoomMessagesRead(roomId, userId) {
    const messages = await ChatMessage.find({
      room: roomId,
      sender: { $ne: userId },
      isDeleted: false,
      deliveryStatus: { $ne: DELIVERY_STATUS.READ },
    });

    const updatedIds = [];

    for (const message of messages) {
      const already = message.readBy.some(
        (r) => r.user.toString() === userId.toString()
      );
      if (!already) {
        message.readBy.push({ user: userId, at: new Date() });
      }
      message.deliveryStatus = DELIVERY_STATUS.READ;
      await message.save();
      updatedIds.push(message._id);
    }

    return updatedIds;
  }

  async softDeleteMessage(messageId, userId) {
    return await ChatMessage.findOneAndUpdate(
      {
        _id: messageId,
        sender: userId,
        isDeleted: false,
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
        content: "",
        searchText: "",
        attachments: [],
      },
      { new: true }
    );
  }

  _toDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  _escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

export default new ChatRepository();
