import Razorpay from "razorpay";
import env from "./env.js";

let razorpayInstance = null;

export const getRazorpay = () => {
  if (razorpayInstance) return razorpayInstance;

  const keyId = process.env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID;
  const keySecret =
    process.env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayInstance;
};

export const getRazorpayConfig = () => ({
  keyId: process.env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID || "",
  keySecret:
    process.env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET || "",
  webhookSecret:
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    env.RAZORPAY_WEBHOOK_SECRET ||
    "",
});

export default getRazorpay;
