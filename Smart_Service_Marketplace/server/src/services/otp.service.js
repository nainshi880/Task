import crypto from "crypto";
import Otp from "../models/Otp.js";
import smsService from "./sms.service.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

class OtpService {
  hashCode(code) {
    return crypto.createHash("sha256").update(String(code)).digest("hex");
  }

  generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  normalizePhone(phone) {
    return smsService.normalizePhone(phone);
  }

  async sendOtp({ phone, purpose = "general", userId = null }) {
    const normalized = this.normalizePhone(phone);
    if (!normalized || normalized.length < 10) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Valid phone number is required.");
    }

    // Invalidate previous unused OTPs for same phone/purpose
    await Otp.updateMany(
      {
        phone: normalized,
        purpose,
        isUsed: false,
      },
      { isUsed: true }
    );

    const code = this.generateCode();
    const otpDoc = await Otp.create({
      phone: normalized,
      user: userId,
      purpose,
      codeHash: this.hashCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    const smsResult = await smsService.sendOtp({
      phone: normalized,
      otp: code,
      userId,
    });

    if (!smsResult.sent && smsResult.reason === "not_configured") {
      // In development, still create OTP but expose hint only when SMS not configured
      return {
        sent: false,
        phone: normalized,
        purpose,
        expiresAt: otpDoc.expiresAt,
        otpId: otpDoc._id,
        reason: "sms_not_configured",
        // Only for local/dev testing when SMS providers aren't set
        ...(process.env.NODE_ENV !== "production" ? { debugOtp: code } : {}),
      };
    }

    if (!smsResult.sent) {
      throw new ApiError(
        HTTP_STATUS.BAD_GATEWAY,
        `Failed to send OTP SMS: ${smsResult.reason}`
      );
    }

    return {
      sent: true,
      phone: normalized,
      purpose,
      expiresAt: otpDoc.expiresAt,
      otpId: otpDoc._id,
      provider: smsResult.provider,
    };
  }

  async verifyOtp({ phone, code, purpose = "general" }) {
    const normalized = this.normalizePhone(phone);
    if (!normalized || !code) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Phone and OTP code are required."
      );
    }

    const otpDoc = await Otp.findOne({
      phone: normalized,
      purpose,
      isUsed: false,
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "OTP not found or already used.");
    }

    if (otpDoc.expiresAt.getTime() < Date.now()) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "OTP has expired.");
    }

    if (otpDoc.attempts >= MAX_ATTEMPTS) {
      otpDoc.isUsed = true;
      await otpDoc.save();
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Too many invalid attempts. Request a new OTP."
      );
    }

    const matches = otpDoc.codeHash === this.hashCode(code);
    if (!matches) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid OTP.");
    }

    otpDoc.isUsed = true;
    otpDoc.verifiedAt = new Date();
    await otpDoc.save();

    return {
      verified: true,
      phone: normalized,
      purpose,
      verifiedAt: otpDoc.verifiedAt,
    };
  }
}

export default new OtpService();
