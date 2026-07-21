import transporter, { isSmtpConfigured } from "../config/mail.js";
import env from "../config/env.js";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/** Brevo SMTP keys look like xsmtpsib-... ; API keys look like xkeysib-... */
function isBrevoSmtpKey(key = "") {
  return String(key).startsWith("xsmtpsib-");
}

function isBrevoApiKey(key = "") {
  const value = String(key).trim();
  return Boolean(value) && !isBrevoSmtpKey(value);
}

export function isEmailConfigured() {
  return isBrevoApiKey(env.BREVO_API_KEY) || isSmtpConfigured();
}

function getSender() {
  const candidates = [
    env.EMAIL_FROM,
    env.COMPANY_EMAIL,
    // Never use Brevo SMTP login (*.smtp-brevo.com) as the From address
    env.EMAIL_USER && !String(env.EMAIL_USER).includes("smtp-brevo.com")
      ? env.EMAIL_USER
      : "",
  ].filter(Boolean);

  const email = candidates[0];
  const name = env.EMAIL_FROM_NAME || env.COMPANY_NAME || "Smart Service Marketplace";

  if (!email) {
    throw new Error(
      "EMAIL_FROM is required. Use a sender address verified in Brevo (not the SMTP login)."
    );
  }

  return { email, name };
}

async function sendViaBrevoApi({ to, subject, html, attachments = [] }) {
  const sender = getSender();

  const payload = {
    sender,
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  if (attachments.length) {
    payload.attachment = attachments.map((file) => {
      const content =
        Buffer.isBuffer(file.content)
          ? file.content.toString("base64")
          : Buffer.from(file.content).toString("base64");

      return {
        name: file.filename || "attachment",
        content,
      };
    });
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": env.BREVO_API_KEY.trim(),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo API ${response.status}: ${body}`);
  }

  return response.json().catch(() => ({ sent: true }));
}

async function sendViaSmtp({ to, subject, html, attachments = [] }) {
  if (!transporter) {
    throw new Error(
      "SMTP is not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS (Brevo SMTP key)."
    );
  }

  const sender = getSender();

  await transporter.sendMail({
    from: `"${sender.name}" <${sender.email}>`,
    to,
    subject,
    html,
    attachments,
  });
}

/**
 * Prefer Brevo REST API when BREVO_API_KEY is an API key (xkeysib-...).
 * SMTP keys (xsmtpsib-...) must use SMTP, not the API.
 */
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  if (isBrevoApiKey(env.BREVO_API_KEY)) {
    return sendViaBrevoApi({ to, subject, html, attachments });
  }

  return sendViaSmtp({ to, subject, html, attachments });
};

export default sendEmail;
