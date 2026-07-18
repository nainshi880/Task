import { useEffect, useState, useCallback } from "react";
import useAuth from "./useAuth";
import {
  connectChatSocket,
  disconnectChatSocket,
  emitWithAck,
  getChatSocket,
} from "../lib/socket";
import { CHAT_EVENTS } from "../constants/chat";

/**
 * Shared Socket.IO connection for chat presence + realtime messages.
 */
export default function useChatSocket({ enabled = true } = {}) {
  const { token, isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(() => new Set());

  useEffect(() => {
    if (!enabled || !isAuthenticated || !token) {
      disconnectChatSocket();
      setConnected(false);
      return undefined;
    }

    const socket = connectChatSocket(token);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onConnected = (payload) => {
      setConnected(true);
      if (Array.isArray(payload?.onlineUsers)) {
        setOnlineUsers(new Set(payload.onlineUsers.map(String)));
      }
    };
    const onOnline = (payload) => {
      if (!payload?.userId) return;
      setOnlineUsers((prev) => new Set(prev).add(String(payload.userId)));
    };
    const onOffline = (payload) => {
      if (!payload?.userId) return;
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(String(payload.userId));
        return next;
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(CHAT_EVENTS.CONNECTED, onConnected);
    socket.on(CHAT_EVENTS.USER_ONLINE, onOnline);
    socket.on(CHAT_EVENTS.USER_OFFLINE, onOffline);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(CHAT_EVENTS.CONNECTED, onConnected);
      socket.off(CHAT_EVENTS.USER_ONLINE, onOnline);
      socket.off(CHAT_EVENTS.USER_OFFLINE, onOffline);
    };
  }, [enabled, isAuthenticated, token]);

  const joinRoom = useCallback(async (roomId) => {
    return emitWithAck(CHAT_EVENTS.JOIN_ROOM, { roomId });
  }, []);

  const leaveRoom = useCallback((roomId) => {
    getChatSocket()?.emit(CHAT_EVENTS.LEAVE_ROOM, { roomId });
  }, []);

  const sendMessage = useCallback(async (payload) => {
    return emitWithAck(CHAT_EVENTS.SEND_MESSAGE, payload);
  }, []);

  const startTyping = useCallback((roomId) => {
    getChatSocket()?.emit(CHAT_EVENTS.TYPING_START, { roomId });
  }, []);

  const stopTyping = useCallback((roomId) => {
    getChatSocket()?.emit(CHAT_EVENTS.TYPING_STOP, { roomId });
  }, []);

  const markRead = useCallback((payload) => {
    getChatSocket()?.emit(CHAT_EVENTS.MESSAGE_READ, payload);
  }, []);

  const markDelivered = useCallback((messageId) => {
    getChatSocket()?.emit(CHAT_EVENTS.MESSAGE_DELIVERED, { messageId });
  }, []);

  const on = useCallback((event, handler) => {
    const socket = getChatSocket();
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  const isOnline = useCallback(
    (userId) => (userId ? onlineUsers.has(String(userId)) : false),
    [onlineUsers]
  );

  return {
    connected,
    onlineUsers,
    isOnline,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
    markRead,
    markDelivered,
    on,
  };
}
