import chatService from "../services/chat.service.js";
import { isUserOnline } from "../sockets/presence.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const listChatRooms = asyncHandler(async (req, res) => {
  const result = await chatService.listRooms(req.user, req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Chat rooms fetched successfully.", result)
  );
});

export const getOrCreateBookingRoom = asyncHandler(async (req, res) => {
  const room = await chatService.getOrCreateRoomForBooking(
    req.user,
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Chat room ready.", {
      room,
      peerOnline: isUserOnline(
        (room.customer._id || room.customer).toString() ===
          req.user._id.toString()
          ? room.technician._id || room.technician
          : room.customer._id || room.customer
      ),
    })
  );
});

export const getChatRoom = asyncHandler(async (req, res) => {
  const room = await chatService.getRoom(req.user, req.params.roomId);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Chat room fetched successfully.", room)
  );
});

export const getChatMessages = asyncHandler(async (req, res) => {
  const result = await chatService.getMessages(
    req.user,
    req.params.roomId,
    req.query
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Messages fetched successfully.",
      result
    )
  );
});

export const searchChatMessages = asyncHandler(async (req, res) => {
  const result = await chatService.searchMessages(
    req.user,
    req.params.roomId,
    req.query
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Message search results.", result)
  );
});

export const searchAllChatMessages = asyncHandler(async (req, res) => {
  const result = await chatService.searchAllMessages(req.user, req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Message search results.", result)
  );
});

export const archiveChatRoom = asyncHandler(async (req, res) => {
  const room = await chatService.archiveRoom(req.user, req.params.roomId);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Conversation archived.", room)
  );
});

export const unarchiveChatRoom = asyncHandler(async (req, res) => {
  const room = await chatService.unarchiveRoom(req.user, req.params.roomId);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Conversation unarchived.", room)
  );
});

export const sendChatMessage = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const message = await chatService.sendMessage(
    req.user,
    req.params.roomId,
    req.body,
    io
  );

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Message sent successfully.",
      message
    )
  );
});

export const uploadChatAttachment = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const files = req.files || (req.file ? [req.file] : []);

  const message = await chatService.uploadAndSend(
    req.user,
    req.params.roomId,
    files,
    {
      content: req.body.content,
      type: req.body.type,
    },
    io
  );

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Attachment message sent successfully.",
      message
    )
  );
});

export const markMessageRead = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const message = await chatService.markMessageRead(
    req.user,
    req.params.messageId,
    io
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Message marked as read.", message)
  );
});

export const markRoomRead = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const result = await chatService.markRoomRead(
    req.user,
    req.params.roomId,
    io
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Room marked as read.", result)
  );
});

export const markMessageDelivered = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const message = await chatService.markMessageDelivered(
    req.user,
    req.params.messageId,
    io
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Message marked as delivered.", message)
  );
});

export const deleteChatMessage = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const message = await chatService.deleteMessage(
    req.user,
    req.params.messageId,
    io
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Message deleted.", message)
  );
});

export const getUserOnlineStatus = asyncHandler(async (req, res) => {
  const online = isUserOnline(req.params.userId);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Presence status fetched.", {
      userId: req.params.userId,
      online,
    })
  );
});
