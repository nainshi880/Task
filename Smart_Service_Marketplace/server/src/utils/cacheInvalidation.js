import cacheService, { CACHE_KEYS } from "./cache.js";

export async function invalidateAdminAnalytics() {
  await Promise.allSettled([
    cacheService.invalidatePrefix(CACHE_KEYS.ADMIN_ANALYTICS_DASHBOARD),
    cacheService.invalidatePrefix(CACHE_KEYS.ADMIN_ANALYTICS_GROWTH),
    cacheService.invalidatePrefix(CACHE_KEYS.ADMIN_ANALYTICS_MONTHLY),
  ]);
}

export async function invalidateAllListCaches() {
  await Promise.allSettled([
    cacheService.invalidatePrefix(CACHE_KEYS.BOOKING_LIST_PREFIX),
    cacheService.invalidatePrefix(CACHE_KEYS.PAYMENT_LIST_PREFIX),
    cacheService.invalidatePrefix(CACHE_KEYS.PAYMENT_ADMIN_LIST_PREFIX),
    cacheService.invalidatePrefix(CACHE_KEYS.TECH_JOBS_PREFIX),
  ]);
}

export default {
  invalidateAdminAnalytics,
  invalidateAllListCaches,
};
