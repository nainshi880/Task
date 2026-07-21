export const CHAT_EVENTS = {
  CONNECTED: "chat:connected",
  JOINED: "chat:joined",
  JOIN_ROOM: "chat:join",
  LEAVE_ROOM: "chat:leave",
  SEND_MESSAGE: "chat:message",
  MESSAGE_NEW: "chat:message:new",
  MESSAGE_DELIVERED: "chat:message:delivered",
  MESSAGE_READ: "chat:message:read",
  MESSAGE_DELETED: "chat:message:deleted",
  TYPING_START: "chat:typing:start",
  TYPING_STOP: "chat:typing:stop",
  USER_ONLINE: "chat:user:online",
  USER_OFFLINE: "chat:user:offline",
  PRESENCE_CHECK: "chat:presence:check",
  PRESENCE_STATUS: "chat:presence:status",
  ERROR: "chat:error",
};

/** Booking / assignment realtime events (same Socket.IO connection). */
export const BOOKING_EVENTS = {
  ASSIGNED: "booking:assigned",
  UPDATED: "booking:updated",
  AVAILABLE: "booking:available",
  CLAIMED: "booking:claimed",
};

export function getSocketBaseUrl() {
  const apiUrl =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
  return apiUrl.replace(/\/api\/v1\/?$/, "") || "http://localhost:5000";
}
