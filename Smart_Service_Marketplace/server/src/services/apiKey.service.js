import apiKeyRepository from "../repositories/apiKey.repository.js";
import authRepository from "../repositories/auth.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import { API_KEY_PREFIX } from "../constants/security.js";

class ApiKeyService {
  async createKey(userId, { name, scopes, expiresAt }) {
    const plainKey = apiKeyRepository.generatePlainKey();
    const keyHash = await apiKeyRepository.hashKey(plainKey);
    const keyPrefix = apiKeyRepository.getPrefix(plainKey);

    const apiKey = await apiKeyRepository.create({
      name,
      keyHash,
      keyPrefix,
      createdBy: userId,
      scopes: scopes?.length ? scopes : ["read"],
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    return {
      apiKey,
      plainKey,
      message: "Store this key securely. It will not be shown again.",
    };
  }

  async listKeys(userId) {
    return await apiKeyRepository.listByUser(userId);
  }

  async revokeKey(userId, keyId) {
    const revoked = await apiKeyRepository.revoke(keyId, userId);

    if (!revoked) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "API key not found.");
    }

    return revoked;
  }

  async verifyKey(plainKey) {
    if (!plainKey || !plainKey.startsWith(API_KEY_PREFIX)) {
      return null;
    }

    const prefix = apiKeyRepository.getPrefix(plainKey);
    const record = await apiKeyRepository.findByPrefix(prefix);

    if (!record) return null;

    if (record.expiresAt && record.expiresAt <= new Date()) {
      return null;
    }

    const valid = await apiKeyRepository.compareKey(plainKey, record.keyHash);

    if (!valid) return null;

    await apiKeyRepository.touchLastUsed(record._id);

    const user = await authRepository.findById(record.createdBy);

    if (!user || !user.isActive) return null;

    return { apiKey: record, user };
  }
}

export default new ApiKeyService();
