import * as notificationApi from "../api/notification.api";

const unwrap = (response) => response.data?.data ?? response.data;

export const listNotifications = async (params) =>
  unwrap(await notificationApi.listNotifications(params));

export const getUnreadCount = async () =>
  unwrap(await notificationApi.getUnreadCount());

export const getNotification = async (notificationId) =>
  unwrap(await notificationApi.getNotification(notificationId));

export const markNotificationRead = async (notificationId) =>
  unwrap(await notificationApi.markNotificationRead(notificationId));

export const markNotificationUnread = async (notificationId) =>
  unwrap(await notificationApi.markNotificationUnread(notificationId));

export const markAllNotificationsRead = async () =>
  unwrap(await notificationApi.markAllNotificationsRead());

export const deleteNotification = async (notificationId) =>
  unwrap(await notificationApi.deleteNotification(notificationId));

export const getPreferences = async () =>
  unwrap(await notificationApi.getPreferences());

export const updatePreferences = async (data) =>
  unwrap(await notificationApi.updatePreferences(data));
