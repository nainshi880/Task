import RefreshToken from "../models/RefreshToken.js";
import Notification from "../models/Notification.js";
import Otp from "../models/Otp.js";
import logger from "../utils/logger.js";

export async function runCleanupJob() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [revokedTokens, oldNotifications, usedOtps] = await Promise.all([
    RefreshToken.deleteMany({
      $or: [
        { revokedAt: { $ne: null, $lt: thirtyDaysAgo } },
        { expiresAt: { $lt: thirtyDaysAgo } },
      ],
    }),
    Notification.deleteMany({
      isDeleted: true,
      deletedAt: { $lt: ninetyDaysAgo },
    }),
    Otp.deleteMany({
      isUsed: true,
      updatedAt: { $lt: thirtyDaysAgo },
    }),
  ]);

  logger.info("cleanup_job_completed", {
    revokedTokensRemoved: revokedTokens.deletedCount,
    notificationsPurged: oldNotifications.deletedCount,
    usedOtpsRemoved: usedOtps.deletedCount,
  });

  return {
    revokedTokensRemoved: revokedTokens.deletedCount,
    notificationsPurged: oldNotifications.deletedCount,
    usedOtpsRemoved: usedOtps.deletedCount,
  };
}

export default runCleanupJob;
