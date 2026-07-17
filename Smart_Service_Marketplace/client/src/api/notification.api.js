import api from "./axios";

export const listNotifications = (params) =>
  api.get("/notifications", { params });

export const getUnreadCount = () => api.get("/notifications/unread-count");

export const getNotification = (notificationId) =>
  api.get(`/notifications/${notificationId}`);

export const markNotificationRead = (notificationId) =>
  api.patch(`/notifications/${notificationId}/read`);

export const markNotificationUnread = (notificationId) =>
  api.patch(`/notifications/${notificationId}/unread`);

export const markAllNotificationsRead = () =>
  api.patch("/notifications/read-all");

export const deleteNotification = (notificationId) =>
  api.delete(`/notifications/${notificationId}`);

export const getPreferences = () => api.get("/notifications/preferences");

export const updatePreferences = (data) =>
  api.put("/notifications/preferences", data);
