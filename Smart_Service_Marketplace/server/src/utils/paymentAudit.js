import auditRepository from "../repositories/audit.repository.js";
import cacheService, { CACHE_KEYS } from "./cache.js";
import { invalidateAdminAnalytics } from "./cacheInvalidation.js";
import logger from "./logger.js";

export async function writePaymentAudit({
  actorId = null,
  action,
  resource = "Payment",
  resourceId = null,
  description,
  metadata = {},
  ipAddress = null,
  userAgent = null,
}) {
  try {
    await auditRepository.create({
      actor: actorId,
      action,
      resource,
      resourceId,
      description,
      metadata,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    logger.warn(`Payment audit log failed: ${error.message}`);
  }
}

export async function invalidatePaymentCache(paymentId = null, customerId = null) {
  const tasks = [
    cacheService.del(CACHE_KEYS.PAYMENT_ANALYTICS),
    cacheService.invalidatePrefix(CACHE_KEYS.PAYMENT_LIST_PREFIX),
    cacheService.invalidatePrefix(CACHE_KEYS.PAYMENT_ADMIN_LIST_PREFIX),
    cacheService.del(CACHE_KEYS.BOOKING_ANALYTICS),
    invalidateAdminAnalytics(),
  ];

  if (paymentId) {
    tasks.push(
      cacheService.del(`${CACHE_KEYS.PAYMENT_STATUS_PREFIX}${paymentId}`)
    );
  }

  if (customerId) {
    tasks.push(
      cacheService.invalidatePrefix(
        `${CACHE_KEYS.PAYMENT_LIST_PREFIX}${customerId}`
      )
    );
  }

  await Promise.allSettled(tasks);
}

export default { writePaymentAudit, invalidatePaymentCache };
