import transporter from "../config/mail.js";
import env from "../config/env.js";

const sendEmail = async ({
  to,
  subject,
  html,
  attachments = [],
}) => {
  await transporter.sendMail({
    from: env.EMAIL_USER || process.env.EMAIL_USER,
    to,
    subject,
    html,
    attachments,
  });
};

export default sendEmail;
