import sendEmail from "../utils/sendEmail.js";
import env from "../config/env.js";
import logger from "../utils/logger.js";
import notificationRepository from "../repositories/notification.repository.js";
import {
  welcomeEmailTemplate,
  bookingConfirmationEmailTemplate,
  bookingCancelledEmailTemplate,
  invoiceEmailTemplate,
  paymentReceiptEmailTemplate,
  passwordResetEmailTemplate,
  emailVerificationTemplate,
  bookingUpdateEmailTemplate,
} from "../utils/emailTemplates.js";

class EmailService {
  isConfigured() {
    return Boolean(env.EMAIL_HOST && env.EMAIL_USER);
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

  async sendInvoice({ user, invoice, pdfBuffer, to }) {
    const tpl = invoiceEmailTemplate({
      name: user?.name || invoice.billTo?.name,
      invoice,
    });
    return this.send({
      to: to || user?.email || invoice.billTo?.email,
      ...tpl,
      attachments: pdfBuffer
        ? [
            {
              filename: `${invoice.invoiceNumber}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ]
        : [],
      userId: user?._id || invoice.customer,
    });
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

  async sendPasswordReset({ user, resetURL }) {
    const tpl = passwordResetEmailTemplate({
      name: user.name,
      resetURL,
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

  async sendEmailVerification({ user, verifyURL }) {
    const tpl = emailVerificationTemplate({
      name: user.name,
      verifyURL,
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
