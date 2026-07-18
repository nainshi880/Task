import api from "./axios";

export const listChatRooms = (params) => api.get("/chat/rooms", { params });

export const getChatRoom = (roomId) => api.get(`/chat/rooms/${roomId}`);

export const getOrCreateBookingRoom = (bookingId) =>
  api.get(`/chat/rooms/booking/${bookingId}`);

export const getChatMessages = (roomId, params) =>
  api.get(`/chat/rooms/${roomId}/messages`, { params });

export const sendChatMessage = (roomId, data) =>
  api.post(`/chat/rooms/${roomId}/messages`, data);

export const uploadChatAttachments = (roomId, formData) =>
  api.post(`/chat/rooms/${roomId}/attachments`, formData);

export const markRoomRead = (roomId) =>
  api.patch(`/chat/rooms/${roomId}/read`);

export const markMessageRead = (messageId) =>
  api.patch(`/chat/messages/${messageId}/read`);

export const markMessageDelivered = (messageId) =>
  api.patch(`/chat/messages/${messageId}/delivered`);

export const deleteChatMessage = (messageId) =>
  api.delete(`/chat/messages/${messageId}`);

export const getUserOnlineStatus = (userId) =>
  api.get(`/chat/presence/${userId}`);
