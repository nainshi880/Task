import authRepository from "../repositories/auth.repository.js";

import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

import generateVerificationToken from "../utils/generateVerificationToken.js";
import generateResetToken from "../utils/generateResetToken.js";
import tokenService from "./token.service.js";
import emailService from "./email.service.js";
import crypto from "crypto";
import ROLES from "../constants/roles.js";

class AuthService {
  sessionMeta(meta = {}) {
    return {
      ipAddress: meta.ipAddress || meta.ip || "",
      userAgent: meta.userAgent || "",
    };
  }

  async register(userData, meta = {}) {
    const { name, email, password, phone } = userData;

    const existingUser = await authRepository.findByEmail(email);

    if (existingUser) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "User already exists with this email."
      );
    }

    const user = await authRepository.createUser({
      name,
      email,
      password,
      phone,
      role: ROLES.CUSTOMER,
    });

    const tokens = await tokenService.issueTokenPair(
      user,
      this.sessionMeta(meta)
    );

    emailService.sendWelcome({ user }).catch(() => {});

    return {
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
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    const { resetToken, hashedToken } = generateResetToken();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await authRepository.saveResetToken(user._id, hashedToken, expiry);

    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const result = await emailService.sendPasswordReset({
      user,
      resetURL,
    });

    if (!result.sent && result.reason === "not_configured") {
      throw new ApiError(
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        "Email is not configured. Set EMAIL_HOST and EMAIL_USER."
      );
    }

    if (!result.sent) {
      throw new ApiError(
        HTTP_STATUS.BAD_GATEWAY,
        "Failed to send password reset email."
      );
    }

    return {
      message: "Password reset email sent successfully.",
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

    if (!result.sent && result.reason === "not_configured") {
      throw new ApiError(
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        "Email is not configured. Set EMAIL_HOST and EMAIL_USER."
      );
    }

    if (!result.sent) {
      throw new ApiError(
        HTTP_STATUS.BAD_GATEWAY,
        "Failed to send verification email."
      );
    }

    return {
      message: "Verification email sent successfully.",
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
    };
  }
}

export default new AuthService();
