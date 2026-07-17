import bcrypt from "bcrypt";
import adminRepository from "../repositories/admin.repository.js";
import authRepository from "../repositories/auth.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import generateToken from "../utils/generateToken.js";
import tokenService from "./token.service.js";
import ADMIN_AUTH from "../constants/adminAuth.js";
import ROLES from "../constants/roles.js";

class AdminService {
  assertAdmin(user) {
    if (!user || user.role !== ROLES.ADMIN) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Admin access required."
      );
    }
  }

  formatProfile(profile, user) {
    if (!profile) return null;
    const obj = profile.toObject ? profile.toObject() : profile;
    return {
      ...obj,
      user: user || obj.user,
      activeSessions: user?.tokenVersion ?? obj.user?.tokenVersion ?? 0,
    };
  }

  async ensureProfile(user) {
    let profile = await adminRepository.findProfileByUserId(user._id);

    if (!profile) {
      profile = await adminRepository.createProfile({
        user: user._id,
        fullName: user.name,
        phone: user.phone || "",
        avatar: user.avatar || null,
      });
      profile = await adminRepository.findProfileByUserId(user._id);
    }

    return profile;
  }

  async login(email, password, meta = {}) {
    const user = await adminRepository.findAdminByEmail(email);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid admin credentials."
      );
    }

    if (!user.isActive) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Admin account has been deactivated."
      );
    }

    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      throw new ApiError(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        "Account temporarily locked due to failed login attempts. Try again later."
      );
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      const updated = await adminRepository.recordLoginAttempt(user._id, {
        success: false,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      if (
        updated.failedLoginAttempts >= ADMIN_AUTH.MAX_FAILED_LOGIN_ATTEMPTS
      ) {
        const lockUntil = new Date(
          Date.now() + ADMIN_AUTH.LOCKOUT_DURATION_MS
        );
        await adminRepository.lockAccount(user._id, lockUntil);
        throw new ApiError(
          HTTP_STATUS.TOO_MANY_REQUESTS,
          "Too many failed attempts. Account locked for 15 minutes."
        );
      }

      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid admin credentials."
      );
    }

    await adminRepository.recordLoginAttempt(user._id, {
      success: true,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const profile = await this.ensureProfile(user);
    await adminRepository.touchLastActive(user._id);

    const freshUser = await adminRepository.findAdminById(user._id);

    const tokens = await tokenService.issueTokenPair(freshUser, {
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      user: freshUser,
      profile: this.formatProfile(profile, freshUser),
      token: tokens.token,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(refreshTokenPlain, meta = {}) {
    const result = await tokenService.rotateRefreshToken(refreshTokenPlain, {
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    this.assertAdmin(result.user);

    const profile = await this.ensureProfile(result.user);

    return {
      user: result.user,
      profile: this.formatProfile(profile, result.user),
      token: result.token,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  async getProfile(userId) {
    const user = await adminRepository.findAdminById(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Admin not found.");
    }

    const profile = await this.ensureProfile(user);
    await adminRepository.touchLastActive(userId);

    return {
      user,
      profile: this.formatProfile(profile, user),
    };
  }

  async updateProfile(userId, data) {
    const user = await adminRepository.findAdminById(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Admin not found.");
    }

    await this.ensureProfile(user);

    const profilePatch = {};
    const userPatch = {};

    if (data.fullName !== undefined) {
      profilePatch.fullName = data.fullName;
      userPatch.name = data.fullName;
    }
    if (data.phone !== undefined) {
      profilePatch.phone = data.phone;
      userPatch.phone = data.phone;
    }
    if (data.avatar !== undefined) profilePatch.avatar = data.avatar;
    if (data.department !== undefined) profilePatch.department = data.department;
    if (data.designation !== undefined) profilePatch.designation = data.designation;

    if (Object.keys(userPatch).length) {
      await authRepository.updateUser(userId, userPatch);
    }

    const profile = await adminRepository.updateProfile(userId, profilePatch);
    const updatedUser = await adminRepository.findAdminById(userId);

    return {
      user: updatedUser,
      profile: this.formatProfile(profile, updatedUser),
    };
  }

  async changePassword(userId, { currentPassword, newPassword, confirmPassword }) {
    const user = await adminRepository.findAdminWithPassword(userId);

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Admin not found.");
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Current password is incorrect."
      );
    }

    if (newPassword !== confirmPassword) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Passwords do not match."
      );
    }

    if (currentPassword === newPassword) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "New password must be different from current password."
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await adminRepository.updatePassword(
      userId,
      hashedPassword
    );

    await tokenService.revokeAllRefreshTokens(userId);

    const tokens = await tokenService.issueTokenPair(updatedUser);

    return {
      message: "Password changed successfully. Other sessions have been revoked.",
      token: tokens.token,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(refreshTokenPlain) {
    await tokenService.revokeRefreshToken(refreshTokenPlain);
    return { message: "Logout successful." };
  }

  async logoutAllDevices(userId) {
    const user = await adminRepository.logoutAllDevices(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Admin not found.");
    }

    await tokenService.revokeAllRefreshTokens(userId);

    return {
      message: "Logged out from all devices successfully.",
      tokenVersion: user.tokenVersion,
    };
  }

  async getSessions(userId) {
    const user = await adminRepository.findAdminById(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Admin not found.");
    }

    const sessions = await adminRepository.getLoginHistory(
      userId,
      ADMIN_AUTH.LOGIN_HISTORY_LIMIT
    );

    return {
      tokenVersion: user.tokenVersion ?? 0,
      sessions,
    };
  }
}

export default new AdminService();
