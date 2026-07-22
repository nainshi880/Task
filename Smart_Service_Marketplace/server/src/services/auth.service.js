import authRepository from "../repositories/auth.repository.js";
import technicianProfileRepository from "../repositories/technicianProfile.repository.js";
import customerRepository from "../repositories/customer.repository.js";
import Otp from "../models/Otp.js";
import PendingRegistration, {
  PENDING_REGISTRATION_TTL_MS,
} from "../models/PendingRegistration.js";

import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

import generateResetToken from "../utils/generateResetToken.js";
import tokenService from "./token.service.js";
import emailService from "./email.service.js";
import crypto from "crypto";
import fs from "fs/promises";
import cloudinary from "../config/cloudinary.js";
import ROLES, { isAdminRole } from "../constants/roles.js";
import { defaultWorkingHours } from "../models/TechnicianProfile.js";
import User from "../models/User.js";
import CustomerProfile from "../models/CustomerProfile.js";
import TechnicianProfile from "../models/TechnicianProfile.js";

const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
const EMAIL_OTP_MAX_ATTEMPTS = 5;

class AuthService {
  sessionMeta(meta = {}) {
    return {
      ipAddress: meta.ipAddress || meta.ip || "",
      userAgent: meta.userAgent || "",
    };
  }

  resolveFullName(userData = {}) {
    if (userData.name?.trim()) {
      return userData.name.trim();
    }

    return `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
  }

  async uploadLocalFile(file, folder) {
    if (!file?.path) return null;

    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder,
        resource_type: "auto",
      });
      return result.secure_url;
    } finally {
      await fs.unlink(file.path).catch(() => {});
    }
  }

  async removeUnfinishedUser(user) {
    if (!user?._id || user.isVerified || isAdminRole(user.role)) {
      return false;
    }

    await Promise.all([
      CustomerProfile.deleteOne({ user: user._id }).catch(() => {}),
      TechnicianProfile.deleteOne({ user: user._id }).catch(() => {}),
      User.deleteOne({ _id: user._id }).catch(() => {}),
    ]);

    return true;
  }

  async assertEmailAvailable(email) {
    const existingUser = await authRepository.findByEmail(email);
    if (!existingUser) return;

    // Allow re-registering if the previous attempt never finished email OTP
    const removed = await this.removeUnfinishedUser(existingUser);
    if (removed) return;

    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      "User already exists with this email. Please log in."
    );
  }

  async assertPhoneAvailable(phone) {
    if (!phone) return;
    const existingPhone = await authRepository.findByPhone(phone);
    if (!existingPhone) return;

    const removed = await this.removeUnfinishedUser(existingPhone);
    if (removed) return;

    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      "User already exists with this phone number."
    );
  }

  async upsertPendingRegistration({
    email,
    password,
    name,
    phone,
    role,
    technician = null,
  }) {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await PendingRegistration.hashPassword(password);
    const expiresAt = new Date(Date.now() + PENDING_REGISTRATION_TTL_MS);

    return PendingRegistration.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          email: normalizedEmail,
          passwordHash,
          name,
          phone: phone || "",
          role,
          technician: technician || undefined,
          expiresAt,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );
  }

  async sendPendingVerificationOtp(pending) {
    const email = pending.email.toLowerCase();
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    const expiry = new Date(Date.now() + EMAIL_OTP_TTL_MS);

    await Otp.updateMany(
      { email, purpose: "verify_email", isUsed: false },
      { isUsed: true }
    );

    await Otp.create({
      email,
      purpose: "verify_email",
      codeHash: otpHash,
      expiresAt: expiry,
    });

    const result = await emailService.sendEmailVerification({
      user: { name: pending.name, email },
      otpCode,
    });

    if (!result.sent) {
      console.error("Email send error:", result.reason);

      throw new ApiError(
        HTTP_STATUS.BAD_GATEWAY,
        `Failed to send verification OTP email.\n${result.reason}`
      );
    }
   

    return {
      message: "Verification OTP sent to your email.",
      email,
      expiresInMinutes: 10,
      pending: true,
    };
  }

  async register(userData) {
    const name = this.resolveFullName(userData);
    const { email, password, phone } = userData;

    if (!name) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "First name and last name are required."
      );
    }

    await this.assertEmailAvailable(email);
    await this.assertPhoneAvailable(phone);

    const pending = await this.upsertPendingRegistration({
      email,
      password,
      name,
      phone,
      role: ROLES.CUSTOMER,
    });

    const emailVerification = await this.sendPendingVerificationOtp(pending);

    return {
      pending: true,
      email: pending.email,
      emailVerification,
    };
  }

  async registerTechnician(userData, files = {}) {
    const name = this.resolveFullName(userData);
    const {
      email,
      password,
      phone,
      profession,
      experience,
      address,
      city,
      state,
      pincode,
    } = userData;

    await this.assertEmailAvailable(email);
    await this.assertPhoneAvailable(phone);

    const profileImage = files.profileImage?.[0] || files.profilePhoto?.[0];
    const identityProof = files.identityProof?.[0];

    if (!profileImage) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Profile image is required."
      );
    }

    if (!identityProof) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Identity proof upload is required."
      );
    }

    const [profilePhotoUrl, identityProofUrl] = await Promise.all([
      this.uploadLocalFile(profileImage, "technicians/profile"),
      this.uploadLocalFile(identityProof, "technicians/identity"),
    ]);

    const pending = await this.upsertPendingRegistration({
      email,
      password,
      name,
      phone,
      role: ROLES.TECHNICIAN,
      technician: {
        profession,
        experience: Number(experience) || 0,
        address,
        city,
        state,
        pincode,
        profilePhotoUrl,
        identityProofUrl,
      },
    });

    const emailVerification = await this.sendPendingVerificationOtp(pending);

    return {
      pending: true,
      email: pending.email,
      emailVerification,
    };
  }

  async completePendingRegistration(pending, meta = {}) {
    const email = pending.email.toLowerCase();
    const existing = await authRepository.findByEmail(email);
    if (existing) {
      await PendingRegistration.deleteOne({ _id: pending._id }).catch(() => {});
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "User already exists with this email. Please log in."
      );
    }

    const user = new User({
      name: pending.name,
      email,
      phone: pending.phone || "",
      role: pending.role,
      password: pending.passwordHash,
      isVerified: true,
      profileCompleted: false,
      ...(pending.role === ROLES.TECHNICIAN
        ? {
            city: pending.technician?.city || "",
            skills: pending.technician?.profession
              ? [pending.technician.profession]
              : [],
            availability: false,
            avatar: pending.technician?.profilePhotoUrl || null,
          }
        : {}),
    });
    user.$locals.passwordAlreadyHashed = true;
    await user.save();

    try {
      if (pending.role === ROLES.CUSTOMER) {
        await customerRepository.createProfile({
          user: user._id,
          fullName: pending.name,
          phone: pending.phone || "",
          profileCompleted: false,
        });
      } else {
        const tech = pending.technician || {};
        await technicianProfileRepository.create({
          user: user._id,
          fullName: pending.name,
          phone: pending.phone,
          profession: tech.profession,
          workingCity: tech.city,
          address: tech.address,
          state: tech.state,
          pincode: tech.pincode,
          skills: tech.profession ? [tech.profession] : [],
          serviceCategories: tech.profession ? [tech.profession] : [],
          experienceYears: Number(tech.experience) || 0,
          profilePhoto: tech.profilePhotoUrl,
          identityProofUrl: tech.identityProofUrl,
          availabilityStatus: false,
          workingHours: defaultWorkingHours(),
          profileCompleted: false,
          applicationStatus: "pending",
        });
      }
    } catch (error) {
      await User.findByIdAndDelete(user._id).catch(() => {});
      throw error;
    }

    await PendingRegistration.deleteOne({ _id: pending._id }).catch(() => {});

    emailService.sendWelcome({ user }).catch(() => {});

    const tokens = await tokenService.issueTokenPair(
      user,
      this.sessionMeta(meta)
    );

    return {
      message: "Email verified successfully. Your account is ready.",
      user,
      ...tokens,
    };
  }

  async login(email, password, meta = {}) {
    const user = await authRepository.findByEmail(email);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid email or password."
      );
    }

    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid email or password."
      );
    }

    if (!user.isActive) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Your account has been deactivated."
      );
    }

    if (isAdminRole(user.role)) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Admin accounts must sign in through the admin portal."
      );
    }

    user.lastLogin = new Date();
    await user.save();

    const tokens = await tokenService.issueTokenPair(
      user,
      this.sessionMeta(meta)
    );

    return {
      user,
      ...tokens,
    };
  }

  async refresh(refreshTokenPlain, meta = {}) {
    return await tokenService.rotateRefreshToken(
      refreshTokenPlain,
      this.sessionMeta(meta)
    );
  }

  async forgotPassword(email) {
    const user = await authRepository.findByEmail(email);

    if (!user) {
      // Avoid account enumeration
      return {
        message: "If an account exists, a password reset email has been sent.",
      };
    }

    const { resetToken, hashedToken } = generateResetToken();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await authRepository.saveResetToken(user._id, hashedToken, expiry);

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");

    await Otp.updateMany(
      {
        email: user.email.toLowerCase(),
        purpose: "password_reset",
        isUsed: false,
      },
      { isUsed: true }
    );

    await Otp.create({
      email: user.email.toLowerCase(),
      user: user._id,
      purpose: "password_reset",
      codeHash: otpHash,
      expiresAt: expiry,
    });

    const resetURL = isAdminRole(user.role)
      ? `${process.env.CLIENT_URL}/reset-password/${resetToken}?from=admin`
      : `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const result = await emailService.sendPasswordReset({
      user,
      resetURL,
      otpCode,
    });

    if (!result.sent) {
      if (result.reason === "not_configured") {
        throw new ApiError(
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          "Email is not configured. Set EMAIL_USER, EMAIL_PASS (Gmail App Password), and EMAIL_FROM."
        );
      }
      throw new ApiError(
        HTTP_STATUS.BAD_GATEWAY,
        "Failed to send password reset email."
      );
    }

    return {
      message: "If an account exists, a password reset email has been sent.",
      delivery: "email",
      expiresInMinutes: 15,
    };
  }

  async verifyForgotPasswordOtp(email, code) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const otpCode = String(code || "").trim();

    if (!normalizedEmail || !otpCode) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Email and OTP code are required."
      );
    }

    const user = await authRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid or expired OTP.");
    }

    const otpDoc = await Otp.findOne({
      email: normalizedEmail,
      purpose: "password_reset",
      isUsed: false,
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "OTP not found or already used.");
    }

    if (otpDoc.expiresAt.getTime() < Date.now()) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "OTP has expired.");
    }

    if (otpDoc.attempts >= 5) {
      otpDoc.isUsed = true;
      await otpDoc.save();
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Too many invalid attempts. Request a new OTP."
      );
    }

    const codeHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    if (otpDoc.codeHash !== codeHash) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid OTP code.");
    }

    otpDoc.isUsed = true;
    otpDoc.verifiedAt = new Date();
    await otpDoc.save();

    const { resetToken, hashedToken } = generateResetToken();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    await authRepository.saveResetToken(user._id, hashedToken, expiry);

    return {
      resetToken,
      email: normalizedEmail,
      expiresInMinutes: 15,
      message: "OTP verified. You can now reset your password.",
    };
  }

  async getCurrentUser(userId) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    return user;
  }

  async logout(refreshTokenPlain) {
    await tokenService.revokeRefreshToken(refreshTokenPlain);

    return {
      message: "Logout successful.",
    };
  }

  async logoutAll(userId) {
    await tokenService.revokeAllRefreshTokens(userId);
    await authRepository.incrementTokenVersion(userId);

    return {
      message: "Logged out from all devices successfully.",
    };
  }

  async resetPassword(token, newPassword) {
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await authRepository.findByResetToken(hashedToken);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid or expired reset token."
      );
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();
    await tokenService.revokeAllRefreshTokens(user._id);

    const tokens = await tokenService.issueTokenPair(user);

    return {
      user,
      ...tokens,
    };
  }

  async sendVerificationEmail(userId) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    if (user.isVerified) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Email already verified."
      );
    }

    // Legacy unverified users (pre-pending flow) — keep resend working
    return this.sendPendingVerificationOtp({
      email: user.email,
      name: user.name,
    });
  }

  async resendVerificationByEmail(email) {
    const normalized = String(email || "").trim().toLowerCase();
    const user = await authRepository.findByEmail(normalized);

    if (user?.isVerified) {
      return {
        message: "Email is already verified. You can sign in.",
        alreadyVerified: true,
      };
    }

    if (user && !user.isVerified) {
      return this.sendVerificationEmail(user._id);
    }

    const pending = await PendingRegistration.findOne({ email: normalized });
    if (!pending) {
      return {
        message:
          "If a signup is in progress for this email, a verification OTP has been sent.",
      };
    }

    return this.sendPendingVerificationOtp(pending);
  }

  async consumeEmailOtp(normalizedEmail, normalizedCode) {
    const otpDoc = await Otp.findOne({
      email: normalizedEmail,
      purpose: "verify_email",
      isUsed: false,
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "OTP not found or already used. Request a new code."
      );
    }

    if (otpDoc.expiresAt.getTime() < Date.now()) {
      otpDoc.isUsed = true;
      await otpDoc.save();
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "OTP has expired. Request a new code."
      );
    }

    if (otpDoc.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
      otpDoc.isUsed = true;
      await otpDoc.save();
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Too many invalid attempts. Request a new OTP."
      );
    }

    const codeHash = crypto
      .createHash("sha256")
      .update(normalizedCode)
      .digest("hex");

    if (otpDoc.codeHash !== codeHash) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid OTP code.");
    }

    otpDoc.isUsed = true;
    otpDoc.verifiedAt = new Date();
    await otpDoc.save();
    return otpDoc;
  }

  async verifyEmailOtp(email, code, meta = {}) {
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const normalizedCode = String(code || "").trim();

    if (!normalizedEmail || !normalizedCode) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Email and OTP code are required."
      );
    }

    const user = await authRepository.findByEmail(normalizedEmail);

    if (user?.isVerified) {
      return {
        message: "Email is already verified.",
        alreadyVerified: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: true,
          profileCompleted: user.profileCompleted,
        },
      };
    }

    await this.consumeEmailOtp(normalizedEmail, normalizedCode);

    const pending = await PendingRegistration.findOne({
      email: normalizedEmail,
    }).select("+passwordHash");

    if (pending) {
      return this.completePendingRegistration(pending, meta);
    }

    // Legacy path: user exists but was never verified
    if (user) {
      user.isVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      const tokens = await tokenService.issueTokenPair(
        user,
        this.sessionMeta(meta)
      );

      return {
        message: "Email verified successfully.",
        user,
        ...tokens,
      };
    }

    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "No pending registration found for this email. Please register again."
    );
  }

  /**
   * Persist FCM/device token for push notifications (e.g. assignment alerts).
   */
  async updateDeviceToken(userId, deviceToken) {
    const token = String(deviceToken || "").trim();
    if (!token) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "deviceToken is required.");
    }

    const user = await authRepository.findById(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    const tokens = Array.isArray(user.deviceTokens)
      ? user.deviceTokens.filter(Boolean)
      : [];
    if (!tokens.includes(token)) {
      tokens.push(token);
    }

    await authRepository.updateUser(userId, {
      deviceToken: token,
      deviceTokens: tokens.slice(-10),
    });

    return { deviceToken: token, registered: true };
  }
}


export default new AuthService();
