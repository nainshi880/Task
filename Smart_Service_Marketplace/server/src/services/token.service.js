import crypto from "crypto";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import refreshTokenRepository from "../repositories/refreshToken.repository.js";
import authRepository from "../repositories/auth.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import { REFRESH_TOKEN_BYTES } from "../constants/security.js";

function parseDurationMs(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return amount * multipliers[unit];
}

class TokenService {
  getAccessExpiresIn() {
    return env.JWT_ACCESS_EXPIRES_IN || env.JWT_EXPIRES_IN || "15m";
  }

  getRefreshExpiresMs() {
    return (
      parseDurationMs(env.JWT_REFRESH_EXPIRES_IN || "7d") ||
      7 * 24 * 60 * 60 * 1000
    );
  }

  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user._id,
        role: user.role,
        tokenVersion: user.tokenVersion ?? 0,
      },
      env.JWT_SECRET,
      { expiresIn: this.getAccessExpiresIn() }
    );
  }

  generateRefreshTokenPlain() {
    return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
  }

  async createRefreshSession(userId, meta = {}) {
    const plainToken = this.generateRefreshTokenPlain();
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + this.getRefreshExpiresMs());

    const record = await refreshTokenRepository.create({
      user: userId,
      tokenHash: refreshTokenRepository.hashToken(plainToken),
      familyId,
      expiresAt,
      userAgent: meta.userAgent || "",
      ipAddress: meta.ipAddress || "",
    });

    return { refreshToken: plainToken, familyId, record };
  }

  async issueTokenPair(user, meta = {}) {
    const accessToken = this.generateAccessToken(user);
    const { refreshToken } = await this.createRefreshSession(user._id, meta);

    return {
      token: accessToken,
      accessToken,
      refreshToken,
    };
  }

  async rotateRefreshToken(refreshTokenPlain, meta = {}) {
    if (!refreshTokenPlain) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Refresh token is required."
      );
    }

    const reused = await refreshTokenRepository.findRevokedByPlainToken(
      refreshTokenPlain
    );

    if (reused) {
      await refreshTokenRepository.revokeFamily(reused.familyId);
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Refresh token reuse detected. All sessions revoked."
      );
    }

    const existing = await refreshTokenRepository.findByPlainToken(
      refreshTokenPlain
    );

    if (!existing || existing.expiresAt <= new Date()) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid or expired refresh token."
      );
    }

    const user = await authRepository.findById(existing.user);

    if (!user || !user.isActive) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "User account is not active."
      );
    }

    const newPlain = this.generateRefreshTokenPlain();
    const expiresAt = new Date(Date.now() + this.getRefreshExpiresMs());

    const newRecord = await refreshTokenRepository.create({
      user: user._id,
      tokenHash: refreshTokenRepository.hashToken(newPlain),
      familyId: existing.familyId,
      expiresAt,
      userAgent: meta.userAgent || existing.userAgent,
      ipAddress: meta.ipAddress || existing.ipAddress,
    });

    await refreshTokenRepository.revoke(existing._id, newRecord._id);

    const accessToken = this.generateAccessToken(user);

    return {
      user,
      token: accessToken,
      accessToken,
      refreshToken: newPlain,
    };
  }

  async revokeRefreshToken(refreshTokenPlain) {
    if (!refreshTokenPlain) return;

    const existing = await refreshTokenRepository.findByPlainToken(
      refreshTokenPlain
    );

    if (existing) {
      await refreshTokenRepository.revoke(existing._id);
    }
  }

  async revokeAllRefreshTokens(userId) {
    await refreshTokenRepository.revokeAllForUser(userId);
  }
}

export default new TokenService();
