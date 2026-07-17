import PlatformSettings from "../models/PlatformSettings.js";
import { PLATFORM_SETTINGS_KEY } from "../constants/platformSettings.js";
import env from "../config/env.js";

function buildDefaults() {
  return {
    key: PLATFORM_SETTINGS_KEY,
    platformName: env.COMPANY_NAME || "Smart Service Marketplace",
    supportEmail: env.COMPANY_EMAIL || env.EMAIL_USER || "",
    supportPhone: env.COMPANY_PHONE || "",
    gst: {
      defaultRate: Number(env.DEFAULT_GST_RATE) || 18,
      companyName: env.COMPANY_NAME || "",
      gstin: env.COMPANY_GSTIN || "",
      address: env.COMPANY_ADDRESS || "",
      city: env.COMPANY_CITY || "",
      state: env.COMPANY_STATE || "",
      postalCode: env.COMPANY_POSTAL_CODE || "",
      email: env.COMPANY_EMAIL || env.EMAIL_USER || "",
      phone: env.COMPANY_PHONE || "",
      pricesIncludeGst: true,
    },
  };
}

class PlatformSettingsRepository {
  async getOrCreate() {
    let settings = await PlatformSettings.findOne({ key: PLATFORM_SETTINGS_KEY })
      .populate("updatedBy", "name email");

    if (!settings) {
      settings = await PlatformSettings.create(buildDefaults());
      settings = await PlatformSettings.findById(settings._id).populate(
        "updatedBy",
        "name email"
      );
    }

    return settings;
  }

  async update(update, adminId) {
    return await PlatformSettings.findOneAndUpdate(
      { key: PLATFORM_SETTINGS_KEY },
      { ...update, updatedBy: adminId },
      { new: true, runValidators: true, upsert: true }
    ).populate("updatedBy", "name email");
  }

  async updateMaintenance(maintenance, adminId) {
    const settings = await this.getOrCreate();
    settings.maintenance = {
      ...settings.maintenance.toObject(),
      ...maintenance,
    };
    settings.updatedBy = adminId;
    await settings.save();
    return await PlatformSettings.findById(settings._id).populate(
      "updatedBy",
      "name email"
    );
  }

  async updateLegal(type, payload, adminId) {
    const settings = await this.getOrCreate();
    const now = new Date();

    if (type === "terms") {
      settings.legal.termsOfService = {
        content: payload.content ?? settings.legal.termsOfService.content,
        version: payload.version ?? settings.legal.termsOfService.version,
        updatedAt: now,
      };
    } else {
      settings.legal.privacyPolicy = {
        content: payload.content ?? settings.legal.privacyPolicy.content,
        version: payload.version ?? settings.legal.privacyPolicy.version,
        updatedAt: now,
      };
    }

    settings.updatedBy = adminId;
    await settings.save();
    return await PlatformSettings.findById(settings._id).populate(
      "updatedBy",
      "name email"
    );
  }
}

export default new PlatformSettingsRepository();
