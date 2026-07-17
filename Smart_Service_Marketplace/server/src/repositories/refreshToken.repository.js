import crypto from "crypto";
import RefreshToken from "../models/RefreshToken.js";

class RefreshTokenRepository {
  hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async create(data) {
    return await RefreshToken.create(data);
  }

  async findByPlainToken(token) {
    const tokenHash = this.hashToken(token);
    return await RefreshToken.findOne({ tokenHash, revokedAt: null });
  }

  async revoke(tokenId, replacedBy = null) {
    return await RefreshToken.findByIdAndUpdate(
      tokenId,
      {
        revokedAt: new Date(),
        ...(replacedBy ? { replacedBy } : {}),
      },
      { new: true }
    );
  }

  async revokeFamily(familyId) {
    return await RefreshToken.updateMany(
      { familyId, revokedAt: null },
      { revokedAt: new Date() }
    );
  }

  async revokeAllForUser(userId) {
    return await RefreshToken.updateMany(
      { user: userId, revokedAt: null },
      { revokedAt: new Date() }
    );
  }

  async findRevokedByPlainToken(token) {
    const tokenHash = this.hashToken(token);
    return await RefreshToken.findOne({
      tokenHash,
      revokedAt: { $ne: null },
    });
  }

  async listActiveForUser(userId) {
    return await RefreshToken.find({
      user: userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .select("-tokenHash");
  }
}

export default new RefreshTokenRepository();
