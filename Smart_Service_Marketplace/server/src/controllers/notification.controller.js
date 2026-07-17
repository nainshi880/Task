import notificationService from "../services/notification.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const listNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.list(req.user._id, req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Notifications fetched successfully.",
      result
    )
  );
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user._id);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Unread count fetched successfully.",
      result
    )
  );
});

export const getNotification = asyncHandler(async (req, res) => {
  const notification = await notificationService.getById(
    req.user._id,
    req.params.notificationId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Notification fetched successfully.",
      notification
    )
  );
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(
    req.user._id,
    req.params.notificationId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Notification marked as read.",
      notification
    )
  );
});

export const markNotificationUnread = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsUnread(
    req.user._id,
    req.params.notificationId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Notification marked as unread.",
      notification
    )
  );
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user._id);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "All notifications marked as read.",
      result
    )
  );
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await notificationService.softDelete(
    req.user._id,
    req.params.notificationId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Notification deleted successfully.",
      notification
    )
  );
});

export const deleteNotifications = asyncHandler(async (req, res) => {
  const onlyRead = req.query.onlyRead !== "false";
  const result = await notificationService.softDeleteAll(req.user._id, {
    onlyRead,
  });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      onlyRead
        ? "Read notifications deleted successfully."
        : "Notifications deleted successfully.",
      result
    )
  );
});

export const getNotificationPreferences = asyncHandler(async (req, res) => {
  const preferences = await notificationService.getPreferences(req.user._id);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Notification preferences fetched successfully.",
      preferences
    )
  );
});

export const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const preferences = await notificationService.updatePreferences(
    req.user._id,
    req.body
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Notification preferences updated successfully.",
      preferences
    )
  );
});

export const broadcastNotification = asyncHandler(async (req, res) => {
  const result = await notificationService.broadcast(req.user._id, req.body);

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Broadcast completed successfully.",
      result
    )
  );
});
