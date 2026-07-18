import authRepository from "../repositories/auth.repository.js";
import technicianProfileRepository from "../repositories/technicianProfile.repository.js";
import customerRepository from "../repositories/customer.repository.js";
import Otp from "../models/Otp.js";

import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

import generateVerificationToken from "../utils/generateVerificationToken.js";
import generateResetToken from "../utils/generateResetToken.js";
import tokenService from "./token.service.js";
import emailService from "./email.service.js";
import crypto from "crypto";
import fs from "fs/promises";
import cloudinary from "../config/cloudinary.js";
import ROLES, { isAdminRole } from "../constants/roles.js";
import { defaultWorkingHours } from "../models/TechnicianProfile.js";
import User from "../models/User.js";

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

  async register(userData, meta = {}) {
    const name = this.resolveFullName(userData);
    const { email, password, phone } = userData;

    if (!name) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "First name and last name are required."
      );
    }

    const existingUser = await authRepository.findByEmail(email);

    if (existingUser) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "User already exists with this email."
      );
    }

    const existingPhone = phone
      ? await authRepository.findByPhone(phone)
      : null;
    if (existingPhone) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "User already exists with this phone number."
      );
    }

    const user = await authRepository.createUser({
      name,
      email,
      password,
      phone,
      role: ROLES.CUSTOMER,
    });

    // Seed a draft CustomerProfile so GET /customer/profile works before setup.
    await customerRepository.createProfile({
      user: user._id,
      fullName: name,
      phone: phone || "",
      profileCompleted: false,
    }).catch(() => {});

    const tokens = await tokenService.issueTokenPair(
      user,
      this.sessionMeta(meta)
    );

    emailService.sendWelcome({ user }).catch(() => {});
    this.sendVerificationEmail(user._id).catch(() => {});

    return {
      user,
      ...tokens,
    };
  }

  async registerTechnician(userData, files = {}, meta = {}) {
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

    const existingUser = await authRepository.findByEmail(email);

    if (existingUser) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        existingUser.role === ROLES.TECHNICIAN
          ? "A technician account already exists with this email. Please log in."
          : "This email is already registered. Use a different email or log in."
      );
    }

    if (phone) {
      const existingPhone = await authRepository.findByPhone(phone);
      if (existingPhone) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          "This phone number is already registered. Use a different number."
        );
      }
    }

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

    let user;
    try {
      user = await authRepository.createUser({
        name,
        email,
        password,
        phone,
        role: ROLES.TECHNICIAN,
        city,
        skills: [profession],
        availability: false,
        avatar: profilePhotoUrl,
      });

      const profile = await technicianProfileRepository.create({
        user: user._id,
        fullName: name,
        phone,
        profession,
        workingCity: city,
        address,
        state,
        pincode,
        skills: [profession],
        serviceCategories: [profession],
        experienceYears: Number(experience) || 0,
        profilePhoto: profilePhotoUrl,
        identityProofUrl,
        availabilityStatus: false,
        workingHours: defaultWorkingHours(),
        profileCompleted: false,
        applicationStatus: "pending",
      });

      const tokens = await tokenService.issueTokenPair(
        user,
        this.sessionMeta(meta)
      );

      emailService.sendWelcome({ user }).catch(() => {});
      this.sendVerificationEmail(user._id).catch(() => {});

      return {
        user,
        profile,
        ...tokens,
      };
    } catch (error) {
      // Avoid leaving an orphan User if profile creation fails.
      if (user?._id) {
        await User.findByIdAndDelete(user._id).catch(() => {});
      }
      throw error;
    }
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
      phone: user.phone || "",
      user: user._id,
      purpose: "password_reset",
      codeHash: otpHash,
      expiresAt: expiry,
    });

    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const result = await emailService.sendPasswordReset({
      user,
      resetURL,
      otpCode,
    });

    const payload = {
      message: "If an account exists, a password reset email has been sent.",
      delivery: result.sent ? "email" : "pending",
      expiresInMinutes: 15,
    };

    if (!result.sent && result.reason === "not_configured") {
      if (process.env.NODE_ENV !== "production") {
        payload.debugOtp = otpCode;
        payload.debugResetToken = resetToken;
        payload.delivery = "debug";
      } else {
        throw new ApiError(
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          "Email is not configured. Set EMAIL_HOST and EMAIL_USER."
        );
      }
    }

    if (!result.sent && result.reason !== "not_configured") {
      if (process.env.NODE_ENV !== "production") {
        payload.debugOtp = otpCode;
        payload.debugResetToken = resetToken;
        payload.delivery = "debug";
      } else {
        throw new ApiError(
          HTTP_STATUS.BAD_GATEWAY,
          "Failed to send password reset email."
        );
      }
    }

    return payload;
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

    const { verificationToken, hashedToken } = generateVerificationToken();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await authRepository.saveVerificationToken(userId, hashedToken, expiry);

    const verifyURL = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

    const result = await emailService.sendEmailVerification({
      user,
      verifyURL,
    });

    const payload = {
      message: "Verification email sent successfully.",
      email: user.email,
      expiresInHours: 24,
    };

    if (!result.sent) {
      if (process.env.NODE_ENV !== "production") {
        payload.debugVerifyURL = verifyURL;
        payload.delivery = "debug";
        payload.message =
          "Email not configured — use debugVerifyURL in development.";
        return payload;
      }

      if (result.reason === "not_configured") {
        throw new ApiError(
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          "Email is not configured. Set EMAIL_HOST and EMAIL_USER."
        );
      }

      throw new ApiError(
        HTTP_STATUS.BAD_GATEWAY,
        "Failed to send verification email."
      );
    }

    return payload;
  }

  async resendVerificationByEmail(email) {
    const user = await authRepository.findByEmail(email);

    if (!user) {
      return {
        message:
          "If an account exists and is unverified, a verification email has been sent.",
      };
    }

    if (user.isVerified) {
      return {
        message: "Email is already verified. You can sign in.",
        alreadyVerified: true,
      };
    }

    const result = await this.sendVerificationEmail(user._id);

    return {
      ...result,
      message:
        result.message ||
        "If an account exists and is unverified, a verification email has been sent.",
    };
  }

  async verifyEmail(token) {
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await authRepository.findByVerificationToken(hashedToken);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid or expired verification token."
      );
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    return {
      message: "Email verified successfully.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: true,
      },
    };
  }
}

export default new AuthService();
