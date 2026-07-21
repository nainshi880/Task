import nodemailer from "nodemailer";
import env from "./env.js";

/**
 * Nodemailer transport for Brevo SMTP (or any SMTP).
 *
 * Brevo SMTP:
 *   host: smtp-relay.brevo.com
 *   port: 587
 *   user: your Brevo login / SMTP login email
 *   pass: SMTP key (xsmtpsib-...) from Brevo → SMTP & API → SMTP
 *
 * For the REST API, use BREVO_API_KEY with an API key (xkeysib-...), not an SMTP key.
 */
function resolveSmtpAuth() {
  const user = env.EMAIL_USER || env.EMAIL_FROM || env.COMPANY_EMAIL;
  // Allow putting the SMTP key in BREVO_API_KEY by mistake (xsmtpsib-...)
  const pass =
    env.EMAIL_PASS ||
    (String(env.BREVO_API_KEY || "").startsWith("xsmtpsib-")
      ? env.BREVO_API_KEY
      : "");

  return { user, pass };
}

function createTransporter() {
  const { user, pass } = resolveSmtpAuth();
  if (!user || !pass) {
    return null;
  }

  const host = env.EMAIL_HOST || "smtp-relay.brevo.com";
  const port = env.EMAIL_PORT || 587;

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
