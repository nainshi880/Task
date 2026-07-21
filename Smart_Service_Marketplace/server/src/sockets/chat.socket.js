import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import env from "../config/env.js";
import authRepository from "../repositories/auth.repository.js";
import chatService from "../services/chat.service.js";
import { CHAT_EVENTS } from "../constants/chat.js";
import {
  addOnline,
  removeOnline,
  isUserOnline,
  getOnlineUserIds,
} from "./presence.js";
import { createSocketRateLimiter } from "../middlewares/chatRateLimit.middleware.js";
import logger from "../utils/logger.js";

export { isUserOnline, getOnlineUserIds };

const allowMessage = createSocketRateLimiter({ windowMs: 60_000, max: 40 });
const allowTyping = createSocketRateLimiter({ windowMs: 10_000, max: 30 });

async function authenticateSocket(socket, next) {
  try {
    const queryToken = socket.handshake.query?.token;
    const allowQuery =
      env.NODE_ENV !== "production" || env.CHAT_SOCKET_ALLOW_QUERY_TOKEN;

    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization || "").replace(
        /^Bearer\s+/i,
        ""
      ) ||
      (allowQuery ? queryToken : null);

    if (!token) {
      return next(new Error("Authentication required."));
    }

    if (queryToken && !allowQuery && !socket.handshake.auth?.token) {
      return next(
        new Error(
          "Query token auth is disabled. Use auth.token or Authorization header."
        )
      );
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await authRepository.findById(decoded.id);

    if (!user || !user.isActive) {
      return next(new Error("Unauthorized."));
    }

    const tokenVersion = decoded.tokenVersion ?? 0;
    if (tokenVersion !== (user.tokenVersion ?? 0)) {
      return next(new Error("Token has been revoked."));
    }

    socket.user = user;
    socket.tokenPayload = decoded;
    next();
  } catch {
    next(new Error("Invalid or expired token."));
  }
}

function emitError(socket, message) {
  socket.emit(CHAT_EVENTS.ERROR, { message });
}

/**
 * Attach Socket.IO to an HTTP server (single-instance, no Redis adapter).
 */
export async function initChatSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL || "*",
      credentials: true,
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  logger.info("Socket.IO ready (single-instance mode).");

  io.use(authenticateSocket);


  io.on("connection", (socket) => {
    const user = socket.user;
    const userId = user._id.toString();

    addOnline(userId, socket.id);
    socket.join(`user:${userId}`);

    logger.info(`Chat socket connected: ${user.email} (${socket.id})`);

    socket.broadcast.emit(CHAT_EVENTS.USER_ONLINE, {
      userId,
      name: user.name,
    });

    socket.emit("chat:connected", {
      userId,
      onlineUsers: getOnlineUserIds(),
    });

    socket.on(CHAT_EVENTS.JOIN_ROOM, async (payload = {}, ack) => {
      try {
        const roomId = payload.roomId;
        if (!roomId) throw new Error("roomId is required.");

        const room = await chatService.getRoom(user, roomId);
        socket.join(`room:${room._id}`);

        const customerId = (room.customer._id || room.customer).toString();
        const technicianId = (
          room.technician._id || room.technician
        ).toString();

        const peerId =
          customerId === userId ? technicianId : customerId;

        const response = {
          roomId: room._id,
          peerOnline: isUserOnline(peerId),
          peerId,
          archived: Boolean(room.isArchived),
        };

        if (typeof ack === "function") ack({ success: true, ...response });
        else socket.emit("chat:joined", response);
      } catch (error) {
        emitError(socket, error.message || "Failed to join room.");
        if (typeof ack === "function") {
          ack({ success: false, message: error.message });
        }
      }
    });

    socket.on(CHAT_EVENTS.LEAVE_ROOM, (payload = {}) => {
      if (payload.roomId) {
        socket.leave(`room:${payload.roomId}`);
      }
    });

    socket.on(CHAT_EVENTS.SEND_MESSAGE, async (payload = {}, ack) => {
      try {
        if (!allowMessage(`msg:${userId}`)) {
          throw new Error("Rate limit exceeded. Please slow down.");
        }

        const { roomId, content, type, attachments } = payload;
        if (!roomId) throw new Error("roomId is required.");

        const message = await chatService.sendMessage(
          user,
          roomId,
          { content, type, attachments },
          io
        );

        if (typeof ack === "function") {
          ack({ success: true, message });
        }
      } catch (error) {
        emitError(socket, error.message || "Failed to send message.");
        if (typeof ack === "function") {
          ack({ success: false, message: error.message });
        }
      }
    });

    socket.on(CHAT_EVENTS.TYPING_START, (payload = {}) => {
      if (!payload.roomId) return;
      if (!allowTyping(`typing:${userId}:${payload.roomId}`)) return;
      socket.to(`room:${payload.roomId}`).emit(CHAT_EVENTS.TYPING_START, {
        roomId: payload.roomId,
        userId,
        name: user.name,
      });
    });

    socket.on(CHAT_EVENTS.TYPING_STOP, (payload = {}) => {
      if (!payload.roomId) return;
      socket.to(`room:${payload.roomId}`).emit(CHAT_EVENTS.TYPING_STOP, {
        roomId: payload.roomId,
        userId,
        name: user.name,
      });
    });

    socket.on(CHAT_EVENTS.MESSAGE_DELIVERED, async (payload = {}, ack) => {
      try {
        if (!payload.messageId) throw new Error("messageId is required.");
        const message = await chatService.markMessageDelivered(
          user,
          payload.messageId,
          io
        );
        if (typeof ack === "function") ack({ success: true, message });
      } catch (error) {
        emitError(socket, error.message || "Failed to mark delivered.");
        if (typeof ack === "function") {
          ack({ success: false, message: error.message });
        }
      }
    });

    socket.on(CHAT_EVENTS.MESSAGE_READ, async (payload = {}, ack) => {
      try {
        if (payload.roomId && !payload.messageId) {
          const result = await chatService.markRoomRead(
            user,
            payload.roomId,
            io
          );
          if (typeof ack === "function") ack({ success: true, ...result });
          return;
        }

        if (!payload.messageId) throw new Error("messageId is required.");
        const message = await chatService.markMessageRead(
          user,
          payload.messageId,
          io
        );
        if (typeof ack === "function") ack({ success: true, message });
      } catch (error) {
        emitError(socket, error.message || "Failed to mark read.");
        if (typeof ack === "function") {
          ack({ success: false, message: error.message });
        }
      }
    });

    socket.on("chat:presence:check", (payload = {}, ack) => {
      const targetId = payload.userId;
      const online = targetId ? isUserOnline(targetId) : false;
      if (typeof ack === "function") {
        ack({ userId: targetId, online });
      } else {
        socket.emit("chat:presence:status", { userId: targetId, online });
      }
    });

    socket.on("disconnect", () => {
      const wentOffline = removeOnline(userId, socket.id);
      logger.info(`Chat socket disconnected: ${user.email} (${socket.id})`);

      if (wentOffline) {
        socket.broadcast.emit(CHAT_EVENTS.USER_OFFLINE, {
          userId,
          name: user.name,
          lastSeen: new Date().toISOString(),
        });
      }
    });
  });

  return io;
}

export default initChatSocket;
