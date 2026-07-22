import transporter, { isSmtpConfigured } from "../config/mail.js";
import env from "../config/env.js";

export function isEmailConfigured() {
  return isSmtpConfigured();
}

function getSender() {
  const candidates = [
    env.EMAIL_FROM,
    env.COMPANY_EMAIL,
    env.EMAIL_USER,
  ].filter(Boolean);

  const email = candidates[0];
  const name =
    env.EMAIL_FROM_NAME || env.COMPANY_NAME || "Smart Service Marketplace";

  if (!email) {
    throw new Error(
      "EMAIL_FROM is required. Set EMAIL_FROM (usually the same as EMAIL_USER for Gmail)."
    );
  }

  return { email, name };
}

/**
 * Send email via Nodemailer + Google SMTP (or any configured SMTP).
 */
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  if (!transporter) {
    throw new Error(
      "SMTP is not configured. Set EMAIL_USER and EMAIL_PASS (Gmail App Password), plus EMAIL_FROM."
    );
  }

  const sender = getSender();

  const info = await transporter.sendMail({
    from: `"${sender.name}" <${sender.email}>`,
    to,
    subject,
    html,
    attachments,
  });

  return { sent: true, messageId: info.messageId };
};

export default sendEmail;
