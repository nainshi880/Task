import deviceTokenRepository from "../repositories/deviceToken.repository.js";
import notificationRepository from "../repositories/notification.repository.js";
import { getFirebaseMessaging, isFcmConfigured } from "../config/firebase.js";
import { getOneSignalConfig, isOneSignalConfigured } from "../config/onesignal.js";
import { PUSH_EVENT, PUSH_PROVIDER } from "../constants/push.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import logger from "../utils/logger.js";

class PushService {
  getProvidersStatus() {
    return {
      fcm: isFcmConfigured(),
      onesignal: isOneSignalConfigured(),
    };
  }

  async registerDevice(userId, data) {
    if (!data.token?.trim()) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Device token is required.");
    }

    const provider = data.provider || PUSH_PROVIDER.FCM;

    return await deviceTokenRepository.upsert({
      userId,
      token: data.token.trim(),
      provider,
      platform: data.platform,
      deviceId: data.deviceId,
      deviceName: data.deviceName,
      appVersion: data.appVersion,
    });
  }

  async unregisterDevice(userId, token) {
    const device = await deviceTokenRepository.deactivateToken(token, userId);
    if (!device) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Device token not found.");
    }
    return device;
  }

  async listDevices(userId) {
    return await deviceTokenRepository.listByUser(userId);
  }

  async shouldSendPush(userId) {
    const prefs = await notificationRepository.getPreferences(userId);
    return prefs.pushNotification !== false;
  }

  /**
   * Non-blocking push to all active devices for a user.
   */
  async sendToUser(userId, { title, body, data = {}, event = null }) {
    try {
      if (!userId) return { sent: 0, skipped: true, reason: "no_user" };

      const allowed = await this.shouldSendPush(userId);
      if (!allowed) {
        return { sent: 0, skipped: true, reason: "preferences_disabled" };
      }

      const devices = await deviceTokenRepository.findActiveByUser(userId);
      if (!devices.length) {
        return { sent: 0, skipped: true, reason: "no_devices" };
      }

      const payloadData = {
        ...Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v ?? "")])
        ),
      };
      if (event) payloadData.event = event;

      let sent = 0;
      const errors = [];

      const fcmTokens = devices
        .filter((d) => d.provider === PUSH_PROVIDER.FCM)
        .map((d) => d.token);

      const oneSignalTokens = devices
        .filter((d) => d.provider === PUSH_PROVIDER.ONESIGNAL)
        .map((d) => d.token);

      if (fcmTokens.length) {
        const fcmResult = await this.sendViaFcm(fcmTokens, {
          title,
          body,
          data: payloadData,
        });
        sent += fcmResult.successCount;
        if (fcmResult.invalidTokens?.length) {
          await deviceTokenRepository.deactivateMany(fcmResult.invalidTokens);
        }
        if (fcmResult.error) errors.push(fcmResult.error);
      }

      if (oneSignalTokens.length || isOneSignalConfigured()) {
        // OneSignal can target by external user id or player ids
        const osResult = await this.sendViaOneSignal({
          title,
          body,
          data: payloadData,
          playerIds: oneSignalTokens,
          externalUserId: userId.toString(),
        });
        sent += osResult.successCount;
        if (osResult.error) errors.push(osResult.error);
      }

      return {
        sent,
        skipped: false,
        providers: this.getProvidersStatus(),
        errors: errors.length ? errors : undefined,
      };
    } catch (error) {
      logger.warn(`Push send failed for user ${userId}: ${error.message}`);
      return { sent: 0, skipped: true, reason: error.message };
    }
  }

  async sendViaFcm(tokens, { title, body, data }) {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      return {
        successCount: 0,
        error: "FCM not configured",
        invalidTokens: [],
      };
    }

    try {
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: { title, body },
        data,
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      });

      const invalidTokens = [];
      response.responses.forEach((res, index) => {
        if (!res.success) {
          const code = res.error?.code || "";
          if (
            code.includes("registration-token-not-registered") ||
            code.includes("invalid-registration-token") ||
            code.includes("messaging/registration-token-not-registered") ||
            code.includes("messaging/invalid-registration-token")
          ) {
            invalidTokens.push(tokens[index]);
          }
        }
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      logger.warn(`FCM multicast failed: ${error.message}`);
      return {
        successCount: 0,
        error: error.message,
        invalidTokens: [],
      };
    }
  }

  async sendViaOneSignal({ title, body, data, playerIds = [], externalUserId }) {
    if (!isOneSignalConfigured()) {
      return {
        successCount: 0,
        error: "OneSignal not configured",
      };
    }

    const { appId, restApiKey } = getOneSignalConfig();

    const payload = {
      app_id: appId,
      headings: { en: title },
      contents: { en: body },
      data,
    };

    if (playerIds.length) {
      payload.include_player_ids = playerIds;
    } else if (externalUserId) {
      payload.include_aliases = {
        external_id: [externalUserId],
      };
      payload.target_channel = "push";
    } else {
      return { successCount: 0, error: "No OneSignal targets" };
    }

    try {
      const response = await fetch("https://api.onesignal.com/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${restApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          successCount: 0,
          error: json.errors?.[0] || `OneSignal HTTP ${response.status}`,
        };
      }

      return {
        successCount: json.recipients || 1,
        id: json.id,
      };
    } catch (error) {
      logger.warn(`OneSignal send failed: ${error.message}`);
      return { successCount: 0, error: error.message };
    }
  }

  // ======================================
  // Feature helpers
  // ======================================

  async notifyBookingAccepted(userId, booking) {
    return this.sendToUser(userId, {
      title: "Booking Accepted",
      body: `Your ${booking.serviceName} booking was accepted by the technician.`,
      event: PUSH_EVENT.BOOKING_ACCEPTED,
      data: {
        bookingId: booking._id,
        type: "booking",
        actionUrl: `/bookings/${booking._id}`,
      },
    });
  }

  async notifyBookingAssigned(userId, booking, { forTechnician = false } = {}) {
    return this.sendToUser(userId, {
      title: forTechnician ? "New Job Assigned" : "Technician Assigned",
      body: forTechnician
        ? `You have been assigned to a ${booking.serviceName} booking.`
        : `A technician has been assigned to your ${booking.serviceName} booking.`,
      event: PUSH_EVENT.BOOKING_ASSIGNED,
      data: {
        bookingId: booking._id,
        type: "booking",
        actionUrl: `/bookings/${booking._id}`,
      },
    });
  }

  async notifyTechnicianArriving(userId, booking) {
    return this.sendToUser(userId, {
      title: "Technician Arriving",
      body: `Your technician is on the way for ${booking.serviceName}.`,
      event: PUSH_EVENT.TECHNICIAN_ARRIVING,
      data: {
        bookingId: booking._id,
        type: "booking",
        actionUrl: `/bookings/${booking._id}`,
      },
    });
  }

  async notifyWorkStarted(userId, booking) {
    return this.sendToUser(userId, {
      title: "Work Started",
      body: `Work has started on your ${booking.serviceName} booking.`,
      event: PUSH_EVENT.WORK_STARTED,
      data: {
        bookingId: booking._id,
        type: "booking",
        actionUrl: `/bookings/${booking._id}`,
      },
    });
  }

  async notifyWorkCompleted(userId, booking) {
    return this.sendToUser(userId, {
      title: "Work Completed",
      body: `Your ${booking.serviceName} booking has been completed.`,
      event: PUSH_EVENT.WORK_COMPLETED,
      data: {
        bookingId: booking._id,
        type: "booking",
        actionUrl: `/bookings/${booking._id}`,
      },
    });
  }

  async notifyPaymentSuccess(userId, { amount, paymentId, bookingId }) {
    return this.sendToUser(userId, {
      title: "Payment Successful",
      body: `Your payment of ₹${amount} was successful.`,
      event: PUSH_EVENT.PAYMENT_SUCCESS,
      data: {
        paymentId: paymentId || "",
        bookingId: bookingId || "",
        type: "payment",
        actionUrl: paymentId ? `/payments/${paymentId}` : "/wallet",
      },
    });
  }

  async notifyPaymentFailed(userId, { reason, paymentId, bookingId }) {
    return this.sendToUser(userId, {
      title: "Payment Failed",
      body: reason || "Your payment could not be completed. Please try again.",
      event: PUSH_EVENT.PAYMENT_FAILED,
      data: {
        paymentId: paymentId || "",
        bookingId: bookingId || "",
        type: "payment",
        actionUrl: paymentId ? `/payments/${paymentId}` : "/payments",
      },
    });
  }

  async notifyReviewReminder(userId, booking) {
    return this.sendToUser(userId, {
      title: "Review Reminder",
      body: `How was your ${booking.serviceName} experience? Leave a quick review.`,
      event: PUSH_EVENT.REVIEW_REMINDER,
      data: {
        bookingId: booking._id,
        type: "review",
        actionUrl: `/bookings/${booking._id}/review`,
      },
    });
  }
}

export default new PushService();
