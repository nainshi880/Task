import dotenv from "dotenv";

dotenv.config();

const requiredEnv = [
  "PORT",
  "MONGODB_URI",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "CLIENT_URL",
];

if (process.env.NODE_ENV === "production") {
  requiredEnv.push(
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "SUPER_ADMIN_EMAIL",
    "SUPER_ADMIN_PASSWORD"
  );
}

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`${key} Missing`);
  }
});

console.log("Environment variables loaded successfully.");  