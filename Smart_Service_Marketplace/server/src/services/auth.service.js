import authRepository from "../repositories/auth.repository.js";

import ApiError from "../utils/ApiError.js";
import generateToken from "../utils/generateToken.js";
import HTTP_STATUS from "../constants/httpStatus.js";

import generateResetToken from "../utils/generateResetToken.js";
import emailService from "./email.service.js";
import crypto from "crypto";
import generateVerificationToken
from "../utils/generateVerificationToken.js";


class AuthService {

  // Register User

  async register(userData) {

    const { name, email, password, phone, role } = userData;

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
      role,
    });

    const token = generateToken({
      id: user._id,
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    });

    // Non-blocking welcome email
    emailService.sendWelcome({ user }).catch(() => {});

    return {
      user,
      token,
    };
  }

  // Login User

  async login(email, password) {

    const user = await authRepository.findByEmail(email);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid email or password."
      );
    }

    const isPasswordMatched =
      await user.comparePassword(password);

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

    const token = generateToken({
      id: user._id,
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    });

    return {
      user,
      token,
    };
  }

  // forgot password
  async forgotPassword(email) {

    const user = await authRepository.findByEmail(email);

    if (!user) {
        throw new ApiError(
            HTTP_STATUS.NOT_FOUND,
            "User not found."
        );
    }

    const { resetToken, hashedToken } =
        generateResetToken();

    const expiry =
        new Date(Date.now() + 15 * 60 * 1000);

    await authRepository.saveResetToken(
        user._id,
        hashedToken,
        expiry
    );

    const resetURL =
`${process.env.CLIENT_URL}/reset-password/${resetToken}`;

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
        message:
            "Password reset email sent successfully.",
    };

}

  // Get Current User
 
  async getCurrentUser(userId) {

    const user =
      await authRepository.findById(userId);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found."
      );
    }

    return user;
  }

  // Logout
  

  async logout() {

    return {
      message: "Logout successful.",
    };

  }
  // Reset Password
  async resetPassword(token, newPassword) {

    const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const user =
        await authRepository.findByResetToken(
            hashedToken
        );

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

    const jwtToken = generateToken({
        id: user._id,
        role: user.role,
        tokenVersion: user.tokenVersion ?? 0,
    });

    return {
        user,
        token: jwtToken,
    };

}

// Send Verification Email

async sendVerificationEmail(userId) {

    const user =
        await authRepository.findById(userId);

    if (!user) {

        throw new ApiError(
            HTTP_STATUS.NOT_FOUND,
            "User not found."
        );

    }

    if (user.isVerified) {

        throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            "Email already verified."
        );

    }

    const {
        verificationToken,
        hashedToken,
    } = generateVerificationToken();

    const expiry =
        new Date(Date.now() + 24 * 60 * 60 * 1000);

    await authRepository.saveVerificationToken(
        user._id,
        hashedToken,
        expiry
    );

    const verifyURL =
`${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

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
        message:
            "Verification email sent successfully.",
    };
}

// Verify Email

async verifyEmail(token) {

    const hashedToken =
        crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const user =
        await authRepository.findByVerificationToken(
            hashedToken
        );

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
        message:
            "Email verified successfully."
    };

}

}

export default new AuthService();