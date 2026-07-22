const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  CLIENT_URL: process.env.CLIENT_URL,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "",
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || "",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  // Nodemailer + Google SMTP (Gmail App Password)
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.COMPANY_EMAIL || "",
  EMAIL_FROM_NAME:
    process.env.EMAIL_FROM_NAME ||
    process.env.COMPANY_NAME ||
    "Smart Service Marketplace",
  EMAIL_HOST: process.env.EMAIL_HOST || "smtp.gmail.com",
  EMAIL_PORT: Number(process.env.EMAIL_PORT) || 587,
  EMAIL_USER: process.env.EMAIL_USER || "",
  EMAIL_PASS: process.env.EMAIL_PASS || "",
  COMPANY_NAME: process.env.COMPANY_NAME || "Smart Service Marketplace",
  COMPANY_EMAIL: process.env.COMPANY_EMAIL || "",
  COMPANY_PHONE: process.env.COMPANY_PHONE || "",
  // Firebase Admin (FCM)
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "",
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "",
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || "",
  FIREBASE_SERVICE_ACCOUNT_JSON:
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "",
  // Chat production
  CHAT_ENCRYPTION_KEY: process.env.CHAT_ENCRYPTION_KEY || "",
  CHAT_SOCKET_ALLOW_QUERY_TOKEN:
    process.env.CHAT_SOCKET_ALLOW_QUERY_TOKEN === "true",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  LOG_DIR: process.env.LOG_DIR || "logs",
  LOG_MAX_FILES: process.env.LOG_MAX_FILES || "14d",
  LOG_MAX_SIZE: process.env.LOG_MAX_SIZE || "20m",
};

export default env;
