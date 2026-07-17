import notificationRepository from "../repositories/notification.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import PAGINATION from "../constants/pagination.js";
import NOTIFICATION_TYPES from "../constants/notificationType.js";
import logger from "../utils/logger.js";
import {
  enqueueNotification,
  JOB_TYPES,
} from "../queues/notification.queue.js";

const TYPE_PREF_MAP = {
  [NOTIFICATION_TYPES.BOOKING]: "bookingNotifications",
  [NOTIFICATION_TYPES.PAYMENT]: "paymentNotifications",
  [NOTIFICATION_TYPES.SYSTEM]: "systemNotifications",
  [NOTIFICATION_TYPES.PROMOTION]: "promotionalNotifications",
  [NOTIFICATION_TYPES.CHAT]: "inAppNotification",
};

class NotificationService {
  async shouldNotify(userId, type) {
    const prefs = await notificationRepository.getPreferences(userId);

    if (prefs.inAppNotification === false) {
      return false;
    }

    const prefKey = TYPE_PREF_MAP[type];
    if (prefKey && prefs[prefKey] === false) {
      return false;
    }

    return true;
  }

  /**
   * Create an in-app notification if user preferences allow it.
   * When Redis/BullMQ is available, jobs are queued unless `_fromQueue` is set.
   * Never throws to callers (non-blocking).
   */
  async notify({
    userId,
    title,
    message,
    type = NOTIFICATION_TYPES.SYSTEM,
    bookingId = null,
    paymentId = null,
    actionUrl = "",
    metadata = {},
    priority = "normal",
    skipPreferenceCheck = false,
    _fromQueue = false,
    jobId = undefined,
  }) {
    try {
      if (!userId) return null;

      if (!_fromQueue) {
        const job = await enqueueNotification(
          JOB_TYPES.IN_APP,
          {
            userId,
            title,
            message,
            type,
            bookingId,
            paymentId,
            actionUrl,
            metadata,
            priority,
            skipPreferenceCheck,
            _fromQueue: true,
          },
          { jobId }
        );

        if (job) {
          return { queued: true, jobId: job.id };
        }
      }

      if (!skipPreferenceCheck) {
        const allowed = await this.shouldNotify(userId, type);
        if (!allowed) return null;
      }

      return await notificationRepository.create({
        user: userId,
        title,
        message,
        type,
        booking: bookingId,
        payment: paymentId,
        actionUrl,
        metadata,
        priority,
      });
    } catch (error) {
      logger.warn(`Failed to create notification: ${error.message}`);
      return null;
    }
  }

  async notifyBooking(userId, { title, message, bookingId, metadata, actionUrl }) {
    return this.notify({
      userId,
      title,
      message,
      type: NOTIFICATION_TYPES.BOOKING,
      bookingId,
      metadata,
      actionUrl: actionUrl || (bookingId ? `/bookings/${bookingId}` : ""),
      priority: "normal",
    });
  }

  async notifyPayment(userId, { title, message, paymentId, bookingId, metadata, actionUrl }) {
    return this.notify({
      userId,
      title,
      message,
      type: NOTIFICATION_TYPES.PAYMENT,
      paymentId,
      bookingId,
      metadata,
      actionUrl: actionUrl || (paymentId ? `/payments/${paymentId}` : ""),
      priority: "high",
    });
  }

  async notifySystem(userId, { title, message, metadata, actionUrl, priority }) {
    return this.notify({
      userId,
      title,
      message,
      type: NOTIFICATION_TYPES.SYSTEM,
      metadata,
      actionUrl,
      priority: priority || "normal",
    });
  }

  async notifyPromotion(userId, { title, message, metadata, actionUrl }) {
    return this.notify({
      userId,
      title,
      message,
      type: NOTIFICATION_TYPES.PROMOTION,
      metadata,
      actionUrl,
      priority: "low",
    });
  }

  // ======================================
  // List / Read / Delete
  // ======================================

  async list(userId, query = {}) {
    const page = Number(query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(
      Number(query.limit) || PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MAX_LIMIT
    );

    const { items, total } = await notificationRepository.listForUser(
      userId,
      {
        page,
        limit,
        type: query.type,
        isRead: query.isRead,
      }
    );

    const unreadCount = await notificationRepository.countUnread(userId);

    return {
      items,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getUnreadCount(userId) {
    const count = await notificationRepository.countUnread(userId);
    return { unreadCount: count };
  }

  async getById(userId, notificationId) {
    const notification = await notificationRepository.findByIdForUser(
      notificationId,
      userId
    );

    if (!notification) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Notification not found.");
    }

    return notification;
  }

  async markAsRead(userId, notificationId) {
    const notification = await notificationRepository.markRead(
      notificationId,
      userId
    );

    if (!notification) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Notification not found.");
    }

    return notification;
  }

  async markAsUnread(userId, notificationId) {
    const notification = await notificationRepository.markUnread(
      notificationId,
      userId
    );

    if (!notification) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Notification not found.");
    }

    return notification;
  }

  async markAllAsRead(userId) {
    const modifiedCount = await notificationRepository.markAllRead(userId);
    const unreadCount = await notificationRepository.countUnread(userId);
    return { modifiedCount, unreadCount };
  }

  async softDelete(userId, notificationId) {
    const notification = await notificationRepository.softDelete(
      notificationId,
      userId
    );

    if (!notification) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Notification not found.");
    }

    return notification;
  }

  async softDeleteAll(userId, { onlyRead = true } = {}) {
    const deletedCount = await notificationRepository.softDeleteMany(
      userId,
      { onlyRead }
    );
    return { deletedCount };
  }

  // ======================================
  // Preferences
  // ======================================

  async getPreferences(userId) {
    return await notificationRepository.getPreferences(userId);
  }

  async updatePreferences(userId, data) {
    const allowed = [
      "emailNotification",
      "smsNotification",
      "pushNotification",
      "whatsappNotification",
      "inAppNotification",
      "bookingNotifications",
      "paymentNotifications",
      "systemNotifications",
      "promotionalNotifications",
    ];

    const patch = {};
    for (const key of allowed) {
      if (data[key] !== undefined) patch[key] = data[key];
    }

    if (!Object.keys(patch).length) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "No valid preference fields provided."
      );
    }

    const preferences = await notificationRepository.updatePreferences(
      userId,
      patch
    );

    if (!preferences) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    return preferences;
  }

  // ======================================
  // Admin — Broadcast promotional / system
  // ======================================

  async broadcast(adminId, { title, message, type, actionUrl, metadata, city }) {
    const notifType = type || NOTIFICATION_TYPES.PROMOTION;

    if (
      ![
        NOTIFICATION_TYPES.PROMOTION,
        NOTIFICATION_TYPES.SYSTEM,
      ].includes(notifType)
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Broadcast type must be Promotion or System."
      );
    }

    const userIds = await notificationRepository.findCustomerUserIds({
      city,
    });

    if (!userIds.length) {
      return { sent: 0, skipped: 0, totalTargets: 0 };
    }

    let sent = 0;
    let skipped = 0;
    const docs = [];

    for (const userId of userIds) {
      const allowed = await this.shouldNotify(userId, notifType);
      if (!allowed) {
        skipped += 1;
        continue;
      }

      docs.push({
        user: userId,
        title,
        message,
        type: notifType,
        actionUrl: actionUrl || "",
        metadata: {
          ...(metadata || {}),
          broadcastBy: adminId.toString(),
        },
        priority: notifType === NOTIFICATION_TYPES.SYSTEM ? "high" : "low",
      });
    }

    if (docs.length) {
      const created = await notificationRepository.createMany(docs);
      sent = created.length;
    }

    return {
      sent,
      skipped,
      totalTargets: userIds.length,
      type: notifType,
    };
  }
}

export default new NotificationService();
