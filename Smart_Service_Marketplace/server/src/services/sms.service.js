import twilio from "twilio";
import env from "../config/env.js";
import logger from "../utils/logger.js";
import notificationRepository from "../repositories/notification.repository.js";

class SmsService {
  constructor() {
    this.twilioClient = null;
  }

  getTwilioClient() {
    if (this.twilioClient) return this.twilioClient;
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        env.TWILIO_ACCOUNT_SID,
        env.TWILIO_AUTH_TOKEN
      );
    }
    return this.twilioClient;
  }

  isTwilioConfigured() {
    return Boolean(
      env.TWILIO_ACCOUNT_SID &&
        env.TWILIO_AUTH_TOKEN &&
        env.TWILIO_PHONE_NUMBER
    );
  }

  isMsg91Configured() {
    return Boolean(env.MSG91_AUTH_KEY && env.MSG91_SENDER_ID);
  }

  getProviderStatus() {
    return {
      twilio: this.isTwilioConfigured(),
      msg91: this.isMsg91Configured(),
      activeProvider: env.SMS_PROVIDER || (this.isTwilioConfigured() ? "twilio" : this.isMsg91Configured() ? "msg91" : null),
    };
  }

  normalizePhone(phone) {
    if (!phone) return null;
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length === 10) {
      return `${env.SMS_DEFAULT_COUNTRY_CODE || "91"}${digits}`;
    }
    return digits;
  }

  async canSendSms(userId) {
    if (!userId) return true;
    try {
      const prefs = await notificationRepository.getPreferences(userId);
      return prefs.smsNotification !== false;
    } catch {
      return true;
    }
  }

  async sendSms({ to, message, userId = null, skipPreferenceCheck = false }) {
    if (!skipPreferenceCheck && !(await this.canSendSms(userId))) {
      return { sent: false, reason: "preferences_disabled" };
    }

    const phone = this.normalizePhone(to);
    if (!phone) {
      return { sent: false, reason: "invalid_phone" };
    }

    const provider =
      env.SMS_PROVIDER ||
      (this.isTwilioConfigured()
        ? "twilio"
        : this.isMsg91Configured()
          ? "msg91"
          : null);

    if (!provider) {
      logger.warn("SMS not configured — skipping send.");
      return { sent: false, reason: "not_configured" };
    }

    try {
      if (provider === "twilio") {
        return await this.sendViaTwilio(phone, message);
      }
      return await this.sendViaMsg91(phone, message);
    } catch (error) {
      logger.warn(`SMS send failed: ${error.message}`);
      return { sent: false, reason: error.message };
    }
  }

  async sendViaTwilio(phone, message) {
    const client = this.getTwilioClient();
    if (!client || !this.isTwilioConfigured()) {
      return { sent: false, reason: "twilio_not_configured" };
    }

    const result = await client.messages.create({
      body: message,
      from: env.TWILIO_PHONE_NUMBER,
      to: `+${phone}`,
    });

    return {
      sent: true,
      provider: "twilio",
      sid: result.sid,
    };
  }

  async sendViaMsg91(phone, message) {
    if (!this.isMsg91Configured()) {
      return { sent: false, reason: "msg91_not_configured" };
    }

    const payload = {
      sender: env.MSG91_SENDER_ID,
      route: env.MSG91_ROUTE || "4",
      country: env.SMS_DEFAULT_COUNTRY_CODE || "91",
      sms: [
        {
          message,
          to: [phone],
        },
      ],
    };

    const response = await fetch("https://api.msg91.com/api/v2/sendsms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: env.MSG91_AUTH_KEY,
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        sent: false,
        reason: json.message || `MSG91 HTTP ${response.status}`,
        provider: "msg91",
      };
    }

    return {
      sent: true,
      provider: "msg91",
      response: json,
    };
  }

  // ======================================
  // Feature helpers
  // ======================================

  async sendOtp({ phone, otp, userId }) {
    const brand = env.COMPANY_NAME || "Smart Service Marketplace";
    return this.sendSms({
      to: phone,
      message: `${otp} is your ${brand} OTP. Valid for 5 minutes. Do not share it.`,
      userId,
      skipPreferenceCheck: true,
    });
  }

  async sendBookingUpdate({ phone, booking, updateMessage, userId }) {
    return this.sendSms({
      to: phone,
      message: `Booking update (${booking.serviceName}): ${updateMessage}`,
      userId,
    });
  }

  async sendTechnicianArrival({ phone, booking, userId }) {
    return this.sendSms({
      to: phone,
      message: `Your technician is arriving for ${booking.serviceName}. Please be ready.`,
      userId,
    });
  }

  async sendPaymentConfirmation({ phone, amount, userId }) {
    return this.sendSms({
      to: phone,
      message: `Payment of ₹${Number(amount).toFixed(2)} received successfully. Thank you!`,
      userId,
    });
  }
}

export default new SmsService();
