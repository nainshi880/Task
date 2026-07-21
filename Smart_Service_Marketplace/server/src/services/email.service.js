import sendEmail, { isEmailConfigured } from "../utils/sendEmail.js";
import logger from "../utils/logger.js";
import notificationRepository from "../repositories/notification.repository.js";
import {
  welcomeEmailTemplate,
  bookingConfirmationEmailTemplate,
  bookingCancelledEmailTemplate,
  paymentReceiptEmailTemplate,
  passwordResetEmailTemplate,
  emailVerificationTemplate,
  bookingUpdateEmailTemplate,
} from "../utils/emailTemplates.js";

class EmailService {
  isConfigured() {
    return isEmailConfigured();
  }

  async canSendEmail(userId) {
    if (!userId) return true;
    try {
      const prefs = await notificationRepository.getPreferences(userId);
      return prefs.emailNotification !== false;
    } catch {
      return true;
    }
  }

  async send({ to, subject, html, attachments = [], userId = null }) {
    if (!this.isConfigured()) {
      logger.warn("Email not configured — skipping send.");
      return { sent: false, reason: "not_configured" };
    }

    if (!(await this.canSendEmail(userId))) {
      return { sent: false, reason: "preferences_disabled" };
    }

    if (!to) {
      return { sent: false, reason: "no_recipient" };
    }

    try {
      await sendEmail({ to, subject, html, attachments });
      return { sent: true };
    } catch (error) {
      logger.warn(`Email send failed: ${error.message}`);
      return { sent: false, reason: error.message };
    }
  }

  async sendWelcome({ user }) {
    const tpl = welcomeEmailTemplate({ name: user.name });
    return this.send({
      to: user.email,
      ...tpl,
      userId: user._id,
    });
  }

  async sendBookingConfirmation({ user, booking }) {
    const tpl = bookingConfirmationEmailTemplate({
      name: user.name,
      booking,
    });
    return this.send({
      to: user.email,
      ...tpl,
      userId: user._id,
    });
  }

  async sendBookingCancelled({ user, booking, reason }) {
    const tpl = bookingCancelledEmailTemplate({
      name: user.name,
      booking,
      reason,
    });
    return this.send({
      to: user.email,
      ...tpl,
      userId: user._id,
    });
  }

  async sendBookingUpdate({ user, booking, updateTitle, updateMessage }) {
    const tpl = bookingUpdateEmailTemplate({
      name: user.name,
      booking,
      updateTitle,
      updateMessage,
    });
    return this.send({
      to: user.email,
      ...tpl,
      userId: user._id,
    });
  }

  async sendInvoice() {
    logger.warn("Invoice email is unsupported because invoices were removed.");
    return { sent: false, reason: "invoice_unsupported" };
  }

  async sendPaymentReceipt({ user, payment, booking }) {
    const tpl = paymentReceiptEmailTemplate({
      name: user.name,
      payment,
      booking,
    });
    return this.send({
      to: user.email,
      ...tpl,
      userId: user._id,
    });
  }

  async sendPasswordReset({ user, resetURL, otpCode }) {
    const tpl = passwordResetEmailTemplate({
      name: user.name,
      resetURL,
      otpCode,
    });
    // Always send password reset even if prefs disabled
    if (!this.isConfigured()) {
      logger.warn("Email not configured — skipping password reset email.");
      return { sent: false, reason: "not_configured" };
    }
    try {
      await sendEmail({ to: user.email, ...tpl });
      return { sent: true };
    } catch (error) {
      logger.warn(`Password reset email failed: ${error.message}`);
      return { sent: false, reason: error.message };
    }
  }

  async sendEmailVerification({ user, otpCode }) {
    const tpl = emailVerificationTemplate({
      name: user.name,
      otpCode,
    });
    if (!this.isConfigured()) {
      return { sent: false, reason: "not_configured" };
    }
    try {
      await sendEmail({ to: user.email, ...tpl });
      return { sent: true };
    } catch (error) {
      logger.warn(`Verification email failed: ${error.message}`);
      return { sent: false, reason: error.message };
    }
  }
}

export default new EmailService();
