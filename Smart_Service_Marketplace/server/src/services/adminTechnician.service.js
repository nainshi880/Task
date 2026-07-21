import adminTechnicianRepository from "../repositories/adminTechnician.repository.js";
import technicianProfileRepository from "../repositories/technicianProfile.repository.js";
import auditRepository from "../repositories/audit.repository.js";
import notificationService from "./notification.service.js";
import technicianProfileService from "./technicianProfile.service.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import PAGINATION from "../constants/pagination.js";
import AUDIT_ACTION from "../constants/auditAction.js";
import TECHNICIAN_APPLICATION_STATUS from "../constants/technicianApplication.js";
import NOTIFICATION_TYPES from "../constants/notificationType.js";
import ROLES from "../constants/roles.js";

class AdminTechnicianService {
  parsePagination(query = {}) {
    let page = parseInt(query.page, 10);
    let limit = parseInt(query.limit, 10);

    if (Number.isNaN(page) || page < 1) page = PAGINATION.DEFAULT_PAGE;
    if (Number.isNaN(limit) || limit < PAGINATION.MIN_LIMIT) {
      limit = PAGINATION.DEFAULT_LIMIT;
    }
    if (limit > PAGINATION.MAX_LIMIT) limit = PAGINATION.MAX_LIMIT;

    return { page, limit };
  }

  formatPaginated(items, page, limit, total) {
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async writeAudit({ actorId, action, resourceId, description, metadata, ip, userAgent }) {
    try {
      await auditRepository.create({
        actor: actorId,
        action,
        resource: "TechnicianProfile",
        resourceId,
        description,
        metadata,
        ipAddress: ip,
        userAgent,
      });
    } catch {
      // non-blocking
    }
  }

  async assertTechnician(technicianId) {
    const user = await adminTechnicianRepository.findTechnicianUser(technicianId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Technician not found.");
    }

    const profile = await adminTechnicianRepository.findProfileByUserId(technicianId);
    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician profile not found."
      );
    }

    return { user, profile };
  }

  async listTechnicians(query = {}) {
    const { page, limit } = this.parsePagination(query);

    const { technicians, total } =
      await adminTechnicianRepository.listTechnicians({
        search: query.q || query.search,
        applicationStatus: query.applicationStatus,
        isSuspended: query.isSuspended,
        workingCity: query.city || query.workingCity,
        skill: query.skill,
        includeDeleted: query.includeDeleted,
        page,
        limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });

    return this.formatPaginated(technicians, page, limit, total);
  }

  async listPendingApplications(query = {}) {
    return this.listTechnicians({
      ...query,
      applicationStatus: TECHNICIAN_APPLICATION_STATUS.PENDING,
    });
  }

  async getTechnicianDetails(technicianId) {
    const { user, profile } = await this.assertTechnician(technicianId);
    return { user, profile };
  }

  async verifyTechnician(technicianId, adminId, actor = {}) {
    const { user, profile } = await this.assertTechnician(technicianId);

    if (user.isVerified && profile.verifiedAt) {
      return { user, profile, message: "Technician is already verified." };
    }

    await adminTechnicianRepository.updateUser(technicianId, {
      isVerified: true,
    });

    const updatedProfile = await adminTechnicianRepository.updateProfile(
      technicianId,
      {
        verifiedAt: new Date(),
        verifiedBy: adminId,
      }
    );

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.VERIFY,
      resourceId: profile._id,
      description: `Verified technician ${user.email}`,
      metadata: { technicianId },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    await notificationService.notify({
      userId: technicianId,
      title: "Account verified",
      message: "Your technician account has been verified by admin.",
      type: NOTIFICATION_TYPES.SYSTEM,
      actionUrl: "/technician/profile",
    });

    return {
      user: { ...user.toObject(), isVerified: true },
      profile: updatedProfile,
      message: "Technician verified successfully.",
    };
  }

  async approveApplication(technicianId, adminId, actor = {}) {
    const { user, profile } = await this.assertTechnician(technicianId);

    if (profile.applicationStatus === TECHNICIAN_APPLICATION_STATUS.APPROVED) {
      return { user, profile, message: "Application is already approved." };
    }

    const updatedProfile = await adminTechnicianRepository.updateProfile(
      technicianId,
      {
        applicationStatus: TECHNICIAN_APPLICATION_STATUS.APPROVED,
        rejectionReason: "",
        reviewedAt: new Date(),
        reviewedBy: adminId,
        isSuspended: false,
        suspendedAt: null,
        suspendedBy: null,
        suspensionReason: "",
        availabilityStatus: true,
      }
    );

    await adminTechnicianRepository.updateUser(technicianId, {
      isActive: true,
      isVerified: true,
    });

    await technicianProfileService.syncUserFromProfile(
      technicianId,
      updatedProfile
    );

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.APPROVE,
      resourceId: profile._id,
      description: `Approved technician application for ${user.email}`,
      metadata: { technicianId },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    await notificationService.notify({
      userId: technicianId,
      title: "Application approved",
      message: "Your technician application has been approved. You can now receive jobs.",
      type: NOTIFICATION_TYPES.SYSTEM,
      actionUrl: "/technician/dashboard",
    });

    return {
      user: await adminTechnicianRepository.findTechnicianUser(technicianId),
      profile: updatedProfile,
      message: "Technician application approved.",
    };
  }

  async rejectApplication(technicianId, adminId, { reason } = {}, actor = {}) {
    const { user, profile } = await this.assertTechnician(technicianId);

    if (profile.applicationStatus === TECHNICIAN_APPLICATION_STATUS.REJECTED) {
      return { user, profile, message: "Application is already rejected." };
    }

    const updatedProfile = await adminTechnicianRepository.updateProfile(
      technicianId,
      {
        applicationStatus: TECHNICIAN_APPLICATION_STATUS.REJECTED,
        rejectionReason: reason || "Application rejected by admin.",
        reviewedAt: new Date(),
        reviewedBy: adminId,
        availabilityStatus: false,
      }
    );

    await technicianProfileRepository.syncUserFields(technicianId, {
      availability: false,
    });

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.REJECT,
      resourceId: profile._id,
      description: `Rejected technician application for ${user.email}`,
      metadata: { technicianId, reason },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    await notificationService.notify({
      userId: technicianId,
      title: "Application rejected",
      message: reason || "Your technician application was not approved.",
      type: NOTIFICATION_TYPES.SYSTEM,
      actionUrl: "/technician/profile",
    });

    return {
      user,
      profile: updatedProfile,
      message: "Technician application rejected.",
    };
  }

  async suspendTechnician(technicianId, adminId, { reason } = {}, actor = {}) {
    const { user, profile } = await this.assertTechnician(technicianId);

    if (profile.isSuspended) {
      return { user, profile, message: "Technician is already suspended." };
    }

    const updatedProfile = await adminTechnicianRepository.updateProfile(
      technicianId,
      {
        isSuspended: true,
        suspendedAt: new Date(),
        suspendedBy: adminId,
        suspensionReason: reason || "Suspended by admin.",
        availabilityStatus: false,
        onlineStatus: false,
      }
    );

    await adminTechnicianRepository.updateUser(technicianId, {
      availability: false,
      $inc: { tokenVersion: 1 },
    });

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.SUSPEND,
      resourceId: profile._id,
      description: `Suspended technician ${user.email}`,
      metadata: { technicianId, reason },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    await notificationService.notify({
      userId: technicianId,
      title: "Account suspended",
      message: reason || "Your technician account has been suspended.",
      type: NOTIFICATION_TYPES.SYSTEM,
    });

    return {
      user: await adminTechnicianRepository.findTechnicianUser(technicianId),
      profile: updatedProfile,
      message: "Technician suspended successfully.",
    };
  }

  async unsuspendTechnician(technicianId, adminId, actor = {}) {
    const { user, profile } = await this.assertTechnician(technicianId);

    if (!profile.isSuspended) {
      return { user, profile, message: "Technician is not suspended." };
    }

    if (profile.applicationStatus !== TECHNICIAN_APPLICATION_STATUS.APPROVED) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Only approved technicians can be unsuspended. Approve the application first."
      );
    }

    const updatedProfile = await adminTechnicianRepository.updateProfile(
      technicianId,
      {
        isSuspended: false,
        suspendedAt: null,
        suspendedBy: null,
        suspensionReason: "",
        availabilityStatus: true,
      }
    );

    await technicianProfileService.syncUserFromProfile(
      technicianId,
      updatedProfile
    );

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.UNSUSPEND,
      resourceId: profile._id,
      description: `Unsuspended technician ${user.email}`,
      metadata: { technicianId },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      user,
      profile: updatedProfile,
      message: "Technician unsuspended successfully.",
    };
  }

  async updateAvailability(technicianId, adminId, data, actor = {}) {
    const { user, profile } = await this.assertTechnician(technicianId);

    if (profile.isSuspended) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Cannot update availability for a suspended technician."
      );
    }

    const patch = {};

    if (data.availabilityStatus !== undefined) {
      patch.availabilityStatus = data.availabilityStatus;
    }
    if (data.onlineStatus !== undefined) patch.onlineStatus = data.onlineStatus;
    if (data.vacationMode !== undefined) patch.vacationMode = data.vacationMode;
    if (data.vacationStart !== undefined) patch.vacationStart = data.vacationStart;
    if (data.vacationEnd !== undefined) patch.vacationEnd = data.vacationEnd;
    if (data.vacationReason !== undefined) patch.vacationReason = data.vacationReason;
    if (data.serviceAreas !== undefined) patch.serviceAreas = data.serviceAreas;
    if (data.workingHours !== undefined) patch.workingHours = data.workingHours;

    if (!Object.keys(patch).length) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "No availability fields provided."
      );
    }

    const updatedProfile = await adminTechnicianRepository.updateProfile(
      technicianId,
      patch
    );

    await technicianProfileService.syncUserFromProfile(
      technicianId,
      updatedProfile
    );

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.UPDATE,
      resourceId: profile._id,
      description: `Updated availability for technician ${user.email}`,
      metadata: { technicianId, patch },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      profile: updatedProfile,
      message: "Technician availability updated.",
    };
  }

  async getRatings(technicianId) {
    await this.assertTechnician(technicianId);
    return await adminTechnicianRepository.getRatingSummary(technicianId);
  }

  async assignCategories(technicianId, adminId, { skills, serviceCategories }, actor = {}) {
    const { user, profile } = await this.assertTechnician(technicianId);

    const categories =
      serviceCategories?.length > 0
        ? serviceCategories
        : skills;

    if (!categories?.length) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "At least one category/skill is required."
      );
    }

    const updatedProfile = await technicianProfileRepository.updateSkills(
      technicianId,
      categories
    );

    await technicianProfileService.syncUserFromProfile(
      technicianId,
      updatedProfile
    );

    await this.writeAudit({
      actorId: adminId,
      action: AUDIT_ACTION.UPDATE,
      resourceId: profile._id,
      description: `Assigned categories to technician ${user.email}`,
      metadata: { technicianId, categories },
      ip: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      profile: updatedProfile,
      message: "Service categories assigned successfully.",
    };
  }
}

export default new AdminTechnicianService();
