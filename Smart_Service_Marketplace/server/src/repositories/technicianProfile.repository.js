import TechnicianProfile from "../models/TechnicianProfile.js";
import User from "../models/User.js";

class TechnicianProfileRepository {
  async create(profileData) {
    return await TechnicianProfile.create(profileData);
  }

  async findByUserId(userId) {
    return await TechnicianProfile.findOne({
      user: userId,
      isDeleted: false,
    }).populate(
      "user",
      "name email phone city role isVerified isActive availability rating skills maxWorkload"
    );
  }

  async findById(profileId) {
    return await TechnicianProfile.findOne({
      _id: profileId,
      isDeleted: false,
    }).populate(
      "user",
      "name email phone city role isVerified isActive"
    );
  }

  async profileExists(userId) {
    return await TechnicianProfile.exists({
      user: userId,
      isDeleted: false,
    });
  }

  async updateByUserId(userId, updateData) {
    return await TechnicianProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      {
        ...updateData,
        lastProfileUpdated: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate(
      "user",
      "name email phone city role isVerified isActive availability rating skills maxWorkload"
    );
  }

  async updateProfilePhoto(userId, photoUrl) {
    return await TechnicianProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      {
        profilePhoto: photoUrl,
        lastProfileUpdated: new Date(),
      },
      { new: true }
    );
  }

  async deleteProfilePhoto(userId) {
    return await TechnicianProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      {
        profilePhoto: null,
        lastProfileUpdated: new Date(),
      },
      { new: true }
    );
  }

  async updateSkills(userId, skills) {
    return await TechnicianProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      {
        skills,
        serviceCategories: skills,
        lastProfileUpdated: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    );
  }

  async updateServiceCategories(userId, serviceCategories) {
    return await TechnicianProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      {
        serviceCategories,
        skills: serviceCategories,
        lastProfileUpdated: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    );
  }

  async updateAvailability(userId, availabilityStatus) {
    return await TechnicianProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      {
        availabilityStatus,
        lastProfileUpdated: new Date(),
      },
      { new: true }
    );
  }

  async updateOnlineStatus(userId, onlineStatus) {
    return await TechnicianProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      {
        onlineStatus,
        lastProfileUpdated: new Date(),
      },
      { new: true }
    );
  }

  async updateVacationMode(userId, vacationData) {
    return await TechnicianProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      {
        ...vacationData,
        lastProfileUpdated: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    );
  }

  async updateServiceAreas(userId, serviceAreas) {
    return await TechnicianProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      {
        serviceAreas,
        lastProfileUpdated: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    );
  }

  async getAvailabilitySettings(userId) {
    return await TechnicianProfile.findOne(
      {
        user: userId,
        isDeleted: false,
      },
      {
        availabilityStatus: 1,
        onlineStatus: 1,
        vacationMode: 1,
        vacationStart: 1,
        vacationEnd: 1,
        vacationReason: 1,
        workingHours: 1,
        workingCity: 1,
        serviceAreas: 1,
      }
    );
  }

  async updateWorkingHours(userId, workingHours) {
    return await TechnicianProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      {
        workingHours,
        lastProfileUpdated: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    );
  }

  async updateCertifications(userId, certifications) {
    return await TechnicianProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      {
        certifications,
        lastProfileUpdated: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    );
  }

  async addCertification(userId, certification) {
    return await TechnicianProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      {
        $push: { certifications: certification },
        lastProfileUpdated: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    );
  }

  async removeCertification(userId, certificationId) {
    return await TechnicianProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      {
        $pull: { certifications: { _id: certificationId } },
        lastProfileUpdated: new Date(),
      },
      { new: true }
    );
  }

  async syncUserFields(userId, fields) {
    return await User.findByIdAndUpdate(
      userId,
      fields,
      { new: true }
    ).select(
      "name email phone city avatar availability skills rating maxWorkload"
    );
  }

  async softDelete(userId) {
    return await TechnicianProfile.findOneAndUpdate(
      { user: userId },
      { isDeleted: true },
      { new: true }
    );
  }
}

export default new TechnicianProfileRepository();
