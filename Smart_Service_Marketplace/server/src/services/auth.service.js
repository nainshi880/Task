import authRepository from "../repositories/auth.repository.js";

import ApiError from "../utils/ApiError.js";
import generateToken from "../utils/generateToken.js";
import HTTP_STATUS from "../constants/httpStatus.js";

import generateResetToken from "../utils/generateResetToken.js";
import sendEmail from "../utils/sendEmail.js";
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
    });

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

    const html = `
        <h2>Password Reset</h2>

        <p>Click below to reset your password.</p>

        <a href="${resetURL}">
            Reset Password
        </a>

        <p>This link expires in 15 minutes.</p>
    `;

    await sendEmail({
        to: user.email,
        subject: "Password Reset",
        html,
    });

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

    await user.save();

    const jwtToken = generateToken({
        id: user._id,
        role: user.role,
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

    await sendEmail({

        to: user.email,

        subject: "Verify Email",

        html: `
        <h2>Email Verification</h2>

        <p>
        Click below to verify your email.
        </p>

        <a href="${verifyURL}">
        Verify Email
        </a>

        <p>
        Link expires in 24 hours.
        </p>
        `

    });

    return {
        message:
        "Verification email sent successfully."
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