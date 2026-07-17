import crypto from "crypto";
import bcrypt from "bcrypt";
import ApiKey from "../models/ApiKey.js";
import { API_KEY_PREFIX } from "../constants/security.js";

class ApiKeyRepository {
  async create({ name, keyHash, keyPrefix, createdBy, scopes, expiresAt }) {
    return await ApiKey.create({
      name,
      keyHash,
      keyPrefix,
      createdBy,
      scopes,
      expiresAt,
    });
  }

  async findByPrefix(prefix) {
    return await ApiKey.findOne({
      keyPrefix: prefix,
      isActive: true,
    });
  }

  async listByUser(userId) {
    return await ApiKey.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .select("-keyHash");
  }

  async findById(keyId) {
    return await ApiKey.findById(keyId).select("-keyHash");
  }

  async revoke(keyId, userId) {
    return await ApiKey.findOneAndUpdate(
      { _id: keyId, createdBy: userId },
      { isActive: false },
      { new: true }
    ).select("-keyHash");
  }

  async touchLastUsed(keyId) {
    return await ApiKey.findByIdAndUpdate(keyId, {
      lastUsedAt: new Date(),
    });
  }

  generatePlainKey() {
    const random = crypto.randomBytes(32).toString("hex");
    return `${API_KEY_PREFIX}${random}`;
  }

  getPrefix(plainKey) {
    return plainKey.slice(0, API_KEY_PREFIX.length + 8);
  }

  async hashKey(plainKey) {
    return await bcrypt.hash(plainKey, 10);
  }

  async compareKey(plainKey, hash) {
    return await bcrypt.compare(plainKey, hash);
  }
}

export default new ApiKeyRepository();
