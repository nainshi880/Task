import platformSettingsRepository from "../repositories/platformSettings.repository.js";
import cacheService, { CACHE_KEYS, CACHE_TTL } from "../utils/cache.js";
import ROLES from "../constants/roles.js";

class PlatformSettingsService {
  async getSettings({ bypassCache = false } = {}) {
    if (!bypassCache) {
      const cached = await cacheService.get(CACHE_KEYS.PLATFORM_SETTINGS);
      if (cached) return { ...cached, cached: true };
    }

    const settings = await platformSettingsRepository.getOrCreate();
    const payload = settings.toObject();

    await cacheService.set(
      CACHE_KEYS.PLATFORM_SETTINGS,
      payload,
      CACHE_TTL.SETTINGS
    );

    return { ...payload, cached: false };
  }

  async invalidateCache() {
    await cacheService.del(CACHE_KEYS.PLATFORM_SETTINGS);
    await cacheService.invalidatePrefix(CACHE_KEYS.PLATFORM_PUBLIC_PREFIX);
  }

  async getPublicSettings() {
    const cacheKey = `${CACHE_KEYS.PLATFORM_PUBLIC_PREFIX}:all`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return { ...cached, cached: true };

    const settings = await this.getSettings();

    const payload = {
      platformName: settings.platformName,
      currency: settings.currency,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      maintenance: {
        enabled: settings.maintenance?.enabled || false,
        message: settings.maintenance?.message || "",
      },
      legal: {
        termsOfService: {
          version: settings.legal?.termsOfService?.version || "1.0",
          updatedAt: settings.legal?.termsOfService?.updatedAt || null,
        },
        privacyPolicy: {
          version: settings.legal?.privacyPolicy?.version || "1.0",
          updatedAt: settings.legal?.privacyPolicy?.updatedAt || null,
        },
      },
      fees: {
        minimumBookingAmount: settings.fees?.minimumBookingAmount || 0,
      },
      cached: false,
    };

    await cacheService.set(cacheKey, payload, CACHE_TTL.SETTINGS);
    return payload;
  }

  async isMaintenanceBlocking(role) {
    const settings = await this.getSettings();
    const maintenance = settings.maintenance || {};

    if (!maintenance.enabled) return false;

    const allowed = maintenance.allowedRoles || [ROLES.ADMIN];
    if (role && allowed.includes(role)) return false;

    return true;
  }

  getSellerInfo(settings) {
    const gst = settings?.gst || {};
    return {
      name: gst.companyName || settings?.platformName || "Smart Service Marketplace",
      gstin: gst.gstin || "",
      address: gst.address || "",
      city: gst.city || "",
      state: gst.state || "",
      postalCode: gst.postalCode || "",
      email: gst.email || settings?.supportEmail || "",
      phone: gst.phone || settings?.supportPhone || "",
    };
  }

  getDefaultGstRate(settings) {
    return settings?.gst?.defaultRate ?? 18;
  }
}

export default new PlatformSettingsService();
