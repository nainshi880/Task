import * as chatApi from "../api/chat.api";

const unwrap = (response) => response.data?.data ?? response.data;

export const listChatRooms = async (params) =>
  unwrap(await chatApi.listChatRooms(params));

export const getChatRoom = async (roomId) =>
  unwrap(await chatApi.getChatRoom(roomId));

export const getOrCreateBookingRoom = async (bookingId) =>
  unwrap(await chatApi.getOrCreateBookingRoom(bookingId));

export const getChatMessages = async (roomId, params) =>
  unwrap(await chatApi.getChatMessages(roomId, params));

export const sendChatMessage = async (roomId, data) =>
  unwrap(await chatApi.sendChatMessage(roomId, data));

export const uploadChatAttachments = async (roomId, files) => {
  const formData = new FormData();
  const list = Array.isArray(files) ? files : [files];
  list.forEach((file) => formData.append("files", file));
  return unwrap(await chatApi.uploadChatAttachments(roomId, formData));
};

export const markRoomRead = async (roomId) =>
  unwrap(await chatApi.markRoomRead(roomId));

export const markMessageRead = async (messageId) =>
  unwrap(await chatApi.markMessageRead(messageId));

export const markMessageDelivered = async (messageId) =>
  unwrap(await chatApi.markMessageDelivered(messageId));

export const deleteChatMessage = async (messageId) =>
  unwrap(await chatApi.deleteChatMessage(messageId));

export const getUserOnlineStatus = async (userId) =>
  unwrap(await chatApi.getUserOnlineStatus(userId));
