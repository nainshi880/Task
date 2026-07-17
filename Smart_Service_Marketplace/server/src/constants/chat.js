const MESSAGE_TYPE = {
  TEXT: "text",
  IMAGE: "image",
  FILE: "file",
  SYSTEM: "system",
};

const DELIVERY_STATUS = {
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
};

const CHAT_EVENTS = {
  JOIN_ROOM: "chat:join",
  LEAVE_ROOM: "chat:leave",
  SEND_MESSAGE: "chat:message",
  MESSAGE_NEW: "chat:message:new",
  MESSAGE_DELIVERED: "chat:message:delivered",
  MESSAGE_READ: "chat:message:read",
  TYPING_START: "chat:typing:start",
  TYPING_STOP: "chat:typing:stop",
  USER_ONLINE: "chat:user:online",
  USER_OFFLINE: "chat:user:offline",
  ROOM_HISTORY: "chat:history",
  ERROR: "chat:error",
};

export { MESSAGE_TYPE, DELIVERY_STATUS, CHAT_EVENTS };
