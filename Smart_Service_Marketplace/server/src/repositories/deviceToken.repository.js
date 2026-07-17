import DeviceToken from "../models/DeviceToken.js";
import { PUSH_PROVIDER } from "../constants/push.js";

class DeviceTokenRepository {
  async upsert({
    userId,
    token,
    provider = PUSH_PROVIDER.FCM,
    platform,
    deviceId,
    deviceName,
    appVersion,
  }) {
    return await DeviceToken.findOneAndUpdate(
      { token, provider },
      {
        $set: {
          user: userId,
          platform,
          deviceId: deviceId || "",
          deviceName: deviceName || "",
          appVersion: appVersion || "",
          isActive: true,
          lastUsedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );
  }

  async findActiveByUser(userId, provider = null) {
    const filter = { user: userId, isActive: true };
    if (provider) filter.provider = provider;
    return await DeviceToken.find(filter).sort({ lastUsedAt: -1 });
  }

  async deactivateToken(token, userId = null) {
    const filter = { token };
    if (userId) filter.user = userId;
    return await DeviceToken.findOneAndUpdate(
      filter,
      { isActive: false },
      { new: true }
    );
  }

  async deactivateMany(tokens = []) {
    if (!tokens.length) return 0;
    const result = await DeviceToken.updateMany(
      { token: { $in: tokens } },
      { isActive: false }
    );
    return result.modifiedCount;
  }

  async listByUser(userId) {
    return await DeviceToken.find({ user: userId }).sort({ updatedAt: -1 });
  }

  async touch(token) {
    return await DeviceToken.findOneAndUpdate(
      { token, isActive: true },
      { lastUsedAt: new Date() },
      { new: true }
    );
  }
}

export default new DeviceTokenRepository();
