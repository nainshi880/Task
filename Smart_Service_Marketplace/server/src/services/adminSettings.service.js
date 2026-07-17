import platformSettingsRepository from "../repositories/platformSettings.repository.js";
import serviceCategoryRepository from "../repositories/serviceCategory.repository.js";
import bannerRepository from "../repositories/banner.repository.js";
import platformSettingsService from "./platformSettings.service.js";
import auditRepository from "../repositories/audit.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import AUDIT_ACTION from "../constants/auditAction.js";

class AdminSettingsService {
  async writeAudit({
    actorId,
    action,
    description,
    metadata,
    ip,
    userAgent,
  }) {
    try {
      await auditRepository.create({
        actor: actorId,
        action,
        resource: "PlatformSettings",
        resourceId: null,
        description,
        metadata,
        ipAddress: ip,
        userAgent,
      });
    } catch {
      // non-blocking
    }
  }

  async getAllSettings() {
    const [settings, categories, banners] = await Promise.all([
      platformSettingsService.getSettings(),
      serviceCategoryRepository.list({ includeInactive: true }),
      bannerRepository.list({ includeInactive: true }),
    ]);

    return {
      settings,
      categories,
      banners,
    };
  }

  async updateSettings(adminId, body, actor = {}) {
    const allowed = [
      "platformName",
      "supportEmail",
      "supportPhone",
      "currency",
      "commission",
      "gst",
      "fees",
      "notifications",
    ];

    const update = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        update[key] = body[key];
      }
    }

    if (Object.keys(update).length === 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "No valid settings to update.");
    }

    const settings = await platformSettingsRepository.update(update, adminId);
    await platformSettingsService.invalidateCache();

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.UPDATE,
      description: "Platform settings updated",
      metadata: { fields: Object.keys(update) },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return settings;
  }

  async updateMaintenance(adminId, body, actor = {}) {
    const maintenance = {};

    if (body.enabled !== undefined) maintenance.enabled = Boolean(body.enabled);
    if (body.message !== undefined) maintenance.message = body.message;
    if (body.allowedRoles !== undefined) {
      maintenance.allowedRoles = body.allowedRoles;
    }
    if (body.scheduledStart !== undefined) {
      maintenance.scheduledStart = body.scheduledStart;
    }
    if (body.scheduledEnd !== undefined) {
      maintenance.scheduledEnd = body.scheduledEnd;
    }

    const settings = await platformSettingsRepository.updateMaintenance(
      maintenance,
      adminId
    );
    await platformSettingsService.invalidateCache();

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.UPDATE,
      description: `Maintenance mode ${maintenance.enabled ? "enabled" : "updated"}`,
      metadata: maintenance,
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      maintenance: settings.maintenance,
      message: maintenance.enabled
        ? "Maintenance mode enabled."
        : "Maintenance settings updated.",
    };
  }

  async updateTerms(adminId, body, actor = {}) {
    const settings = await platformSettingsRepository.updateLegal(
      "terms",
      body,
      adminId
    );
    await platformSettingsService.invalidateCache();

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.UPDATE,
      description: "Terms of service updated",
      metadata: { version: body.version },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return settings.legal.termsOfService;
  }

  async updatePrivacy(adminId, body, actor = {}) {
    const settings = await platformSettingsRepository.updateLegal(
      "privacy",
      body,
      adminId
    );
    await platformSettingsService.invalidateCache();

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.UPDATE,
      description: "Privacy policy updated",
      metadata: { version: body.version },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return settings.legal.privacyPolicy;
  }

  async listCategories(query = {}) {
    const includeInactive =
      query.includeInactive === true || query.includeInactive === "true";
    return await serviceCategoryRepository.list({ includeInactive });
  }

  async createCategory(adminId, body, actor = {}) {
    const existing = await serviceCategoryRepository.findByName(body.name);
    if (existing) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "Service category already exists."
      );
    }

    const category = await serviceCategoryRepository.create(body);
    await platformSettingsService.invalidateCache();

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.CREATE,
      description: `Service category created: ${category.name}`,
      metadata: { categoryId: category._id },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return category;
  }

  async updateCategory(categoryId, adminId, body, actor = {}) {
    const category = await serviceCategoryRepository.findById(categoryId);
    if (!category) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Service category not found.");
    }

    if (body.name && body.name !== category.name) {
      const existing = await serviceCategoryRepository.findByName(body.name);
      if (existing) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          "Service category name already exists."
        );
      }
    }

    const updated = await serviceCategoryRepository.update(categoryId, body);
    await platformSettingsService.invalidateCache();

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.UPDATE,
      description: `Service category updated: ${updated.name}`,
      metadata: { categoryId },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  async deleteCategory(categoryId, adminId, actor = {}) {
    const category = await serviceCategoryRepository.findById(categoryId);
    if (!category) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Service category not found.");
    }

    const updated = await serviceCategoryRepository.remove(categoryId);
    await platformSettingsService.invalidateCache();

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.DELETE,
      description: `Service category deactivated: ${category.name}`,
      metadata: { categoryId },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  async listBanners(query = {}) {
    const includeInactive =
      query.includeInactive === true || query.includeInactive === "true";
    return await bannerRepository.list({
      includeInactive,
      position: query.position,
      audience: query.audience,
    });
  }

  async createBanner(adminId, body, actor = {}) {
    const banner = await bannerRepository.create({
      ...body,
      createdBy: adminId,
    });
    await platformSettingsService.invalidateCache();

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.CREATE,
      description: `Banner created: ${banner.title}`,
      metadata: { bannerId: banner._id },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return banner;
  }

  async updateBanner(bannerId, adminId, body, actor = {}) {
    const banner = await bannerRepository.findById(bannerId);
    if (!banner) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Banner not found.");
    }

    const updated = await bannerRepository.update(bannerId, body);
    await platformSettingsService.invalidateCache();

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.UPDATE,
      description: `Banner updated: ${updated.title}`,
      metadata: { bannerId },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  async deleteBanner(bannerId, adminId, actor = {}) {
    const banner = await bannerRepository.findById(bannerId);
    if (!banner) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Banner not found.");
    }

    await bannerRepository.remove(bannerId);
    await platformSettingsService.invalidateCache();

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.DELETE,
      description: `Banner deleted: ${banner.title}`,
      metadata: { bannerId },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { message: "Banner deleted successfully." };
  }
}

export default new AdminSettingsService();
