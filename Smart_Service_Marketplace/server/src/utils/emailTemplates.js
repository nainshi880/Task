import env from "../config/env.js";

const brand = () => env.COMPANY_NAME || "Smart Service Marketplace";
const clientUrl = () => env.CLIENT_URL || "http://localhost:5173";

function layout({ title, bodyHtml }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#111827;color:#ffffff;padding:20px 24px;font-size:18px;font-weight:bold;">
                ${brand()}
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h2 style="margin:0 0 12px;font-size:20px;">${title}</h2>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:#f9fafb;color:#6b7280;font-size:12px;">
                © ${new Date().getFullYear()} ${brand()}. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

function ctaButton(href, label) {
  return `
    <p style="margin:24px 0;">
      <a href="${href}"
         style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold;">
        ${label}
      </a>
    </p>`;
}

export function welcomeEmailTemplate({ name }) {
  const title = `Welcome to ${brand()}`;
  return {
    subject: title,
    html: layout({
      title,
      bodyHtml: `
        <p>Hi ${name || "there"},</p>
        <p>Thanks for joining ${brand()}. You can now book trusted technicians and manage your services in one place.</p>
        ${ctaButton(clientUrl(), "Go to Dashboard")}
      `,
    }),
  };
}

export function bookingConfirmationEmailTemplate({ name, booking }) {
  const title = "Booking Confirmation";
  return {
    subject: `${title} — ${booking.serviceName}`,
    html: layout({
      title,
      bodyHtml: `
        <p>Hi ${name || "there"},</p>
        <p>Your booking has been confirmed.</p>
        <ul>
          <li><strong>Service:</strong> ${booking.serviceName}</li>
          <li><strong>Date:</strong> ${booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString("en-IN") : "-"}</li>
          <li><strong>Time:</strong> ${booking.bookingTime || "-"}</li>
          <li><strong>Amount:</strong> ₹${Number(booking.amount || 0).toFixed(2)}</li>
          <li><strong>Status:</strong> ${booking.status || "Pending"}</li>
        </ul>
        ${ctaButton(`${clientUrl()}/bookings/${booking._id}`, "View Booking")}
      `,
    }),
  };
}

export function bookingCancelledEmailTemplate({ name, booking, reason }) {
  const title = "Booking Cancelled";
  return {
    subject: `${title} — ${booking.serviceName}`,
    html: layout({
      title,
      bodyHtml: `
        <p>Hi ${name || "there"},</p>
        <p>Your booking for <strong>${booking.serviceName}</strong> has been cancelled.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
        ${ctaButton(`${clientUrl()}/bookings`, "Book Again")}
      `,
    }),
  };
}

export function paymentReceiptEmailTemplate({ name, payment, booking }) {
  const title = "Payment Receipt";
  return {
    subject: `${title} — ₹${Number(payment.amount || 0).toFixed(2)}`,
    html: layout({
      title,
      bodyHtml: `
        <p>Hi ${name || "there"},</p>
        <p>We received your payment successfully.</p>
        <ul>
          <li><strong>Amount:</strong> ₹${Number(payment.amount || 0).toFixed(2)}</li>
          <li><strong>Method:</strong> ${payment.method || "Online"}</li>
          <li><strong>Status:</strong> ${payment.status || "Paid"}</li>
          ${booking?.serviceName ? `<li><strong>Service:</strong> ${booking.serviceName}</li>` : ""}
          ${payment.razorpayPaymentId ? `<li><strong>Txn ID:</strong> ${payment.razorpayPaymentId}</li>` : ""}
        </ul>
        ${ctaButton(`${clientUrl()}/payments`, "View Payments")}
      `,
    }),
  };
}

export function passwordResetEmailTemplate({ name, resetURL, otpCode }) {
  const title = "Reset Your Password";
  const otpBlock = otpCode
    ? `
        <p>Or enter this one-time code in the app:</p>
        <p style="font-size:28px;letter-spacing:6px;font-weight:700;color:#312e81;">${otpCode}</p>
      `
    : "";

  return {
    subject: title,
    html: layout({
      title,
      bodyHtml: `
        <p>Hi ${name || "there"},</p>
        <p>We received a request to reset your password. This link and code expire in 15 minutes.</p>
        ${ctaButton(resetURL, "Reset Password")}
        ${otpBlock}
        <p style="color:#6b7280;font-size:13px;">If you did not request this, you can ignore this email.</p>
      `,
    }),
  };
}

export function emailVerificationTemplate({ name, otpCode }) {
  const title = "Verify Your Email";
  return {
    subject: title,
    html: layout({
      title,
      bodyHtml: `
        <p>Hi ${name || "there"},</p>
        <p>Use this one-time code to verify your email and activate your account. It expires in 10 minutes.</p>
        <p style="font-size:28px;letter-spacing:6px;font-weight:700;color:#4f46e5;margin:24px 0;">${otpCode}</p>
        <p style="color:#6b7280;font-size:13px;">If you did not create an account, you can ignore this email.</p>
      `,
    }),
  };
}

export function bookingUpdateEmailTemplate({ name, booking, updateTitle, updateMessage }) {
  return {
    subject: updateTitle || "Booking Update",
    html: layout({
      title: updateTitle || "Booking Update",
      bodyHtml: `
        <p>Hi ${name || "there"},</p>
        <p>${updateMessage}</p>
        <ul>
          <li><strong>Service:</strong> ${booking.serviceName}</li>
          <li><strong>Status:</strong> ${booking.status || "-"}</li>
        </ul>
        ${ctaButton(`${clientUrl()}/bookings/${booking._id}`, "View Booking")}
      `,
    }),
  };
}

export default {
  welcomeEmailTemplate,
  bookingConfirmationEmailTemplate,
  bookingCancelledEmailTemplate,
  paymentReceiptEmailTemplate,
  passwordResetEmailTemplate,
  emailVerificationTemplate,
  bookingUpdateEmailTemplate,
};
