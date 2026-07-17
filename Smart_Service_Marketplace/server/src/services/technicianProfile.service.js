import fs from "fs/promises";
import bcrypt from "bcrypt";
import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";
import technicianProfileRepository from "../repositories/technicianProfile.repository.js";
import tokenService from "./token.service.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import withRetry, { isTransientError } from "../utils/retry.js";
import { defaultWorkingHours } from "../models/TechnicianProfile.js";

class TechnicianProfileService {
  calculateProfileCompletion(data = {}) {
    const hasName = Boolean(data.fullName?.trim());
    const hasPhone = Boolean(data.phone?.trim());
    const hasCity = Boolean(data.workingCity?.trim());
    const hasSkills =
      (data.skills?.length || 0) > 0 ||
      (data.serviceCategories?.length || 0) > 0;
    const hasExperience = data.experienceYears !== undefined;

    return hasName && hasPhone && hasCity && hasSkills && hasExperience;
  }

  async syncUserFromProfile(userId, profile) {
    const skills =
      profile.skills?.length > 0
        ? profile.skills
        : profile.serviceCategories || [];

    const onVacation = Boolean(profile.vacationMode);
    const isAvailable =
      profile.availabilityStatus !== false &&
      profile.onlineStatus !== false &&
      !onVacation;

    await technicianProfileRepository.syncUserFields(userId, {
      city: profile.workingCity || "",
      skills,
      availability: isAvailable,
      avatar: profile.profilePhoto || null,
      phone: profile.phone || undefined,
      name: profile.fullName || undefined,
      profileCompleted: profile.profileCompleted,
    });
  }

  // ======================================
  // Create Technician Profile
  // ======================================

  async createProfile(userId, data) {
    const exists =
      await technicianProfileRepository.profileExists(userId);

    if (exists) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "Technician profile already exists."
      );
    }

    const skills = data.skills?.length
      ? data.skills
      : data.serviceCategories || [];
    const serviceCategories = data.serviceCategories?.length
      ? data.serviceCategories
      : skills;

    if (!skills.length) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "At least one skill or service category is required."
      );
    }

    const profilePayload = {
      user: userId,
      fullName: data.fullName,
      phone: data.phone,
      bio: data.bio,
      workingCity: data.workingCity,
      skills,
      serviceCategories,
      experienceYears: data.experienceYears ?? 0,
      certifications: data.certifications || [],
      availabilityStatus:
        data.availabilityStatus !== undefined
          ? data.availabilityStatus
          : true,
      workingHours: data.workingHours || defaultWorkingHours(),
      profileCompleted: false,
      applicationStatus: "pending",
    };

    profilePayload.profileCompleted =
      this.calculateProfileCompletion(profilePayload);

    const profile =
      await technicianProfileRepository.create(profilePayload);

    await this.syncUserFromProfile(userId, profile);

    return await technicianProfileRepository.findByUserId(userId);
  }

  // ======================================
  // Get Technician Profile
  // ======================================

  async getProfile(userId) {
    const profile =
      await technicianProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found."
      );
    }

    return profile;
  }

  // ======================================
  // Update Technician Profile
  // ======================================

  async updateProfile(userId, data) {
    const existing =
      await technicianProfileRepository.findByUserId(userId);

    if (!existing) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found."
      );
    }

    const allowed = [
      "fullName",
      "phone",
      "bio",
      "workingCity",
      "address",
      "state",
      "pincode",
      "identityProofUrl",
      "skills",
      "serviceCategories",
      "experienceYears",
      "certifications",
      "availabilityStatus",
      "workingHours",
      "workingRadius",
      "serviceAreas",
      "privacy",
    ];

    const updateData = {};
    for (const field of allowed) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    if (updateData.skills && !updateData.serviceCategories) {
      updateData.serviceCategories = updateData.skills;
    }
    if (updateData.serviceCategories && !updateData.skills) {
      updateData.skills = updateData.serviceCategories;
    }

    const merged = {
      fullName: updateData.fullName ?? existing.fullName,
      phone: updateData.phone ?? existing.phone,
      workingCity: updateData.workingCity ?? existing.workingCity,
      skills: updateData.skills ?? existing.skills,
      serviceCategories:
        updateData.serviceCategories ?? existing.serviceCategories,
      experienceYears:
        updateData.experienceYears ?? existing.experienceYears,
    };

    updateData.profileCompleted =
      this.calculateProfileCompletion(merged);

    const profile = await technicianProfileRepository.updateByUserId(
      userId,
      updateData
    );

    await this.syncUserFromProfile(userId, profile);
    return profile;
  }

  // ======================================
  // Upload Profile Photo
  // ======================================

  async uploadProfilePhoto(userId, file) {
    if (!file) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Please upload a profile photo."
      );
    }

    const profile =
      await technicianProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found. Create profile first."
      );
    }

    try {
      const result = await withRetry(
        async () =>
          cloudinary.uploader.upload(file.path, {
            folder: "technician-profile-photos",
          }),
        {
          retries: 3,
          delayMs: 400,
          shouldRetry: isTransientError,
        }
      );

      const updated =
        await technicianProfileRepository.updateProfilePhoto(
          userId,
          result.secure_url
        );

      await technicianProfileRepository.syncUserFields(userId, {
        avatar: result.secure_url,
      });

      return updated;
    } finally {
      try {
        await fs.unlink(file.path);
      } catch {
        // ignore
      }
    }
  }

  async deleteProfilePhoto(userId) {
    const profile =
      await technicianProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found."
      );
    }

    const updated =
      await technicianProfileRepository.deleteProfilePhoto(userId);

    await technicianProfileRepository.syncUserFields(userId, {
      avatar: null,
    });

    return updated;
  }

  async uploadIdentityProof(userId, file) {
    if (!file) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Please upload an Aadhaar or PAN document."
      );
    }

    const profile =
      await technicianProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found. Create profile first."
      );
    }

    try {
      const result = await withRetry(
        async () =>
          cloudinary.uploader.upload(file.path, {
            folder: "technician-identity-proofs",
            resource_type: "auto",
          }),
        {
          retries: 3,
          delayMs: 400,
          shouldRetry: isTransientError,
        }
      );

      return await technicianProfileRepository.updateByUserId(userId, {
        identityProofUrl: result.secure_url,
      });
    } finally {
      try {
        await fs.unlink(file.path);
      } catch {
        // ignore
      }
    }
  }

  async uploadCertificationDocument(userId, file, meta = {}) {
    if (!file) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Please upload a certificate document."
      );
    }

    if (!meta.name?.trim()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Certification name is required."
      );
    }

    const profile =
      await technicianProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found."
      );
    }

    try {
      const result = await withRetry(
        async () =>
          cloudinary.uploader.upload(file.path, {
            folder: "technician-certifications",
            resource_type: "auto",
          }),
        {
          retries: 3,
          delayMs: 400,
          shouldRetry: isTransientError,
        }
      );

      return await this.addCertification(userId, {
        name: meta.name.trim(),
        issuedBy: meta.issuedBy?.trim() || "",
        issuedAt: meta.issuedAt || undefined,
        expiresAt: meta.expiresAt || undefined,
        documentUrl: result.secure_url,
      });
    } finally {
      try {
        await fs.unlink(file.path);
      } catch {
        // ignore
      }
    }
  }

  async completeProfileSetup(userId, data = {}) {
    const profile =
      await technicianProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found."
      );
    }

    const updateData = {};

    if (data.workingRadius !== undefined) {
      updateData.workingRadius = Number(data.workingRadius);
    }
    if (Array.isArray(data.serviceAreas) && data.serviceAreas.length) {
      updateData.serviceAreas = data.serviceAreas;
    }
    if (data.availabilityStatus !== undefined) {
      updateData.availabilityStatus = Boolean(data.availabilityStatus);
    }
    if (data.workingHours) {
      updateData.workingHours = data.workingHours;
    }
    if (Array.isArray(data.serviceCategories) && data.serviceCategories.length) {
      updateData.serviceCategories = data.serviceCategories;
      updateData.skills = data.serviceCategories;
    }
    if (data.experienceYears !== undefined) {
      updateData.experienceYears = Number(data.experienceYears);
    }
    if (data.workingCity) {
      updateData.workingCity = data.workingCity;
    }

    const merged = {
      fullName: profile.fullName,
      phone: profile.phone,
      workingCity: updateData.workingCity ?? profile.workingCity,
      skills: updateData.skills ?? profile.skills,
      serviceCategories:
        updateData.serviceCategories ?? profile.serviceCategories,
      experienceYears:
        updateData.experienceYears ?? profile.experienceYears,
    };

    updateData.profileCompleted = this.calculateProfileCompletion(merged);

    const updated = await technicianProfileRepository.updateByUserId(
      userId,
      updateData
    );

    await this.syncUserFromProfile(userId, updated);
    return updated;
  }

  // ======================================
  // Manage Skills
  // ======================================

  async updateSkills(userId, skills) {
    const profile =
      await technicianProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found."
      );
    }

    if (!Array.isArray(skills) || skills.length === 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Skills must be a non-empty array."
      );
    }

    const updated = await technicianProfileRepository.updateSkills(
      userId,
      skills
    );

    await this.syncUserFromProfile(userId, updated);
    return updated;
  }

  // ======================================
  // Service Categories
  // ======================================

  async updateServiceCategories(userId, serviceCategories) {
    const profile =
      await technicianProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found."
      );
    }

    if (
      !Array.isArray(serviceCategories) ||
      serviceCategories.length === 0
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Service categories must be a non-empty array."
      );
    }

    const updated =
      await technicianProfileRepository.updateServiceCategories(
        userId,
        serviceCategories
      );

    await this.syncUserFromProfile(userId, updated);
    return updated;
  }

  // ======================================
  // Availability
  // ======================================

  async updateAvailability(userId, availabilityStatus) {
    const profile =
      await technicianProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found."
      );
    }

    const updated =
      await technicianProfileRepository.updateAvailability(
        userId,
        availabilityStatus
      );

    await technicianProfileRepository.syncUserFields(userId, {
      availability: availabilityStatus,
    });

    return updated;
  }

  // ======================================
  // Working Hours
  // ======================================

  async updateWorkingHours(userId, workingHours) {
    const profile =
      await technicianProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found."
      );
    }

    return await technicianProfileRepository.updateWorkingHours(
      userId,
      workingHours
    );
  }

  // ======================================
  // Certifications
  // ======================================

  async updateCertifications(userId, certifications) {
    const profile =
      await technicianProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found."
      );
    }

    return await technicianProfileRepository.updateCertifications(
      userId,
      certifications
    );
  }

  async addCertification(userId, certification) {
    const profile =
      await technicianProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found."
      );
    }

    return await technicianProfileRepository.addCertification(
      userId,
      certification
    );
  }

  async removeCertification(userId, certificationId) {
    const profile =
      await technicianProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found."
      );
    }

    const updated =
      await technicianProfileRepository.removeCertification(
        userId,
        certificationId
      );

    return updated;
  }

  async changePassword(userId, { currentPassword, newPassword, confirmPassword }) {
    const user = await User.findById(userId).select("+password");

    if (!user || user.isDeleted) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordCorrect) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Current password is incorrect."
      );
    }

    if (newPassword !== confirmPassword) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Passwords do not match."
      );
    }

    if (currentPassword === newPassword) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "New password must be different from current password."
      );
    }

    user.password = newPassword;
    await user.save();

    try {
      await tokenService.revokeAllRefreshTokens(userId);
    } catch {
      // non-fatal if token revoke fails
    }

    return { message: "Password changed successfully." };
  }
}

export default new TechnicianProfileService();
