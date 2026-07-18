import { io } from "socket.io-client";
import { getSocketBaseUrl } from "../constants/chat";

let socket = null;

export function getChatSocket() {
  return socket;
}

export function connectChatSocket(token) {
  if (!token) return null;

  if (socket?.connected) return socket;

  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io(getSocketBaseUrl(), {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    withCredentials: true,
    autoConnect: true,
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1500,
  });

  return socket;
}

export function disconnectChatSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function emitWithAck(event, payload, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error("Socket not connected"));
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error("Socket request timed out"));
    }, timeoutMs);

    socket.emit(event, payload, (ack) => {
      clearTimeout(timer);
      if (ack?.success === false) {
        reject(new Error(ack.message || "Request failed"));
        return;
      }
      resolve(ack);
    });
  });
}
