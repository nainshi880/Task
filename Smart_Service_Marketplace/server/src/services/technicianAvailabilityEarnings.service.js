import technicianProfileRepository from "../repositories/technicianProfile.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

class TechnicianAvailabilityEarningsService {
  computeEffectiveAvailability(profile) {
    const onVacation = this.isCurrentlyOnVacation(profile);
    const online = profile.onlineStatus === true;
    const availableFlag = profile.availabilityStatus !== false;

    return {
      isOnline: online,
      isOnVacation: onVacation,
      isAvailableForJobs: online && !onVacation && availableFlag,
    };
  }

  isCurrentlyOnVacation(profile) {
    if (!profile?.vacationMode) return false;

    const now = new Date();
    if (profile.vacationStart && now < new Date(profile.vacationStart)) {
      return false;
    }
    if (profile.vacationEnd && now > new Date(profile.vacationEnd)) {
      return false;
    }
    return true;
  }

  async syncAvailabilityToUser(userId, profile) {
    const effective = this.computeEffectiveAvailability(profile);
    await technicianProfileRepository.syncUserFields(userId, {
      availability: effective.isAvailableForJobs,
    });
    return effective;
  }

  async ensureProfile(userId) {
    const profile =
      await technicianProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found. Create profile first."
      );
    }

    return profile;
  }

  // ======================================
  // Get Availability Settings
  // ======================================

  async getAvailabilitySettings(userId) {
    const settings =
      await technicianProfileRepository.getAvailabilitySettings(userId);

    if (!settings) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found."
      );
    }

    return {
      ...settings.toObject(),
      ...this.computeEffectiveAvailability(settings),
    };
  }

  // ======================================
  // Online / Offline
  // ======================================

  async setOnlineStatus(userId, onlineStatus) {
    await this.ensureProfile(userId);

    const profile =
      await technicianProfileRepository.updateOnlineStatus(
        userId,
        onlineStatus
      );

    const effective = await this.syncAvailabilityToUser(userId, profile);

    return {
      onlineStatus: profile.onlineStatus,
      vacationMode: profile.vacationMode,
      availabilityStatus: profile.availabilityStatus,
      ...effective,
    };
  }

  // ======================================
  // Vacation Mode
  // ======================================

  async setVacationMode(userId, data) {
    await this.ensureProfile(userId);

    const vacationMode = data.vacationMode === true;

    if (vacationMode) {
      if (data.vacationStart && data.vacationEnd) {
        if (new Date(data.vacationEnd) < new Date(data.vacationStart)) {
          throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            "vacationEnd must be after vacationStart."
          );
        }
      }
    }

    const update = {
      vacationMode,
      vacationReason: data.vacationReason || null,
    };

    if (vacationMode) {
      update.vacationStart = data.vacationStart
        ? new Date(data.vacationStart)
        : new Date();
      update.vacationEnd = data.vacationEnd
        ? new Date(data.vacationEnd)
        : null;
    } else {
      update.vacationStart = null;
      update.vacationEnd = null;
      update.vacationReason = null;
    }

    const profile =
      await technicianProfileRepository.updateVacationMode(
        userId,
        update
      );

    const effective = await this.syncAvailabilityToUser(userId, profile);

    return {
      vacationMode: profile.vacationMode,
      vacationStart: profile.vacationStart,
      vacationEnd: profile.vacationEnd,
      vacationReason: profile.vacationReason,
      onlineStatus: profile.onlineStatus,
      ...effective,
    };
  }

  // ======================================
  // Service Areas
  // ======================================

  async updateServiceAreas(userId, serviceAreas) {
    await this.ensureProfile(userId);

    if (!Array.isArray(serviceAreas) || serviceAreas.length === 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Service areas must be a non-empty array."
      );
    }

    const cleaned = [
      ...new Set(
        serviceAreas
          .map((area) => String(area).trim())
          .filter(Boolean)
      ),
    ];

    const profile =
      await technicianProfileRepository.updateServiceAreas(
        userId,
        cleaned
      );

    // Keep primary working city in sync with first service area if empty mismatch
    if (cleaned.length && profile.workingCity !== cleaned[0]) {
      await technicianProfileRepository.syncUserFields(userId, {
        city: profile.workingCity || cleaned[0],
      });
    }

    return {
      workingCity: profile.workingCity,
      serviceAreas: profile.serviceAreas,
    };
  }

  // ======================================
  // Working Hours (delegate)
  // ======================================

  async updateWorkingHours(userId, workingHours) {
    await this.ensureProfile(userId);
    return await technicianProfileRepository.updateWorkingHours(
      userId,
      workingHours
    );
  }

}

export default new TechnicianAvailabilityEarningsService();
