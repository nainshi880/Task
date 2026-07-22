import nodemailer from "nodemailer";
import env from "./env.js";

/**
 * Nodemailer transport for Google SMTP (Gmail).
 *
 * Setup:
 *   1. Use a Google account with 2-Step Verification enabled
 *   2. Create an App Password: Google Account → Security → App passwords
 *   3. Set in .env:
 *        EMAIL_HOST=smtp.gmail.com
 *        EMAIL_PORT=587
 *        EMAIL_USER=your@gmail.com
 *        EMAIL_PASS=your-16-char-app-password
 *        EMAIL_FROM=your@gmail.com
 *        EMAIL_FROM_NAME=Smart Service Marketplace
 *
 * EMAIL_FROM should usually match EMAIL_USER for Gmail.
 */
function resolveSmtpAuth() {
  const user = env.EMAIL_USER || env.EMAIL_FROM || env.COMPANY_EMAIL;
  const pass = env.EMAIL_PASS;
  return { user, pass };
}

function createTransporter() {
  const { user, pass } = resolveSmtpAuth();
  if (!user || !pass) {
    return null;
  }

  const host = env.EMAIL_HOST || "smtp.gmail.com";
  const port = Number(env.EMAIL_PORT) || 587;
  const isGmail =
    /gmail\.com$/i.test(host) || host.toLowerCase() === "smtp.gmail.com";

  if (isGmail) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const transporter = createTransporter();

export function isSmtpConfigured() {
  return Boolean(transporter);
}

export default transporter;
