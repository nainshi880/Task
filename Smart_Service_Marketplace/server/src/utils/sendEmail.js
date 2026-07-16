import transporter from "../config/mail.js";

const sendEmail = async ({
  to,
  subject,
  html,
}) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
};

export default sendEmail;