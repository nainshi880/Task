import bcrypt from "bcrypt";
import customerRepository from "../repositories/customer.repository.js";
import auditRepository from "../repositories/audit.repository.js";
import User from "../models/User.js";

import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import PAGINATION from "../constants/pagination.js";
import AUDIT_ACTION from "../constants/auditAction.js";

class CustomerService {

  async syncUserFromProfile(userId, profile) {
    if (!profile) return;

    await User.findByIdAndUpdate(userId, {
      name: profile.fullName || undefined,
      phone: profile.phone || undefined,
      avatar: profile.avatar || undefined,
      profileCompleted: Boolean(profile.profileCompleted),
    });
  }

  // ======================================
  // Create Customer Profile
  // ======================================

  async createProfile(userId, profileData) {

    const profileExists =
      await customerRepository.profileExists(userId);

    if (profileExists) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "Customer profile already exists."
      );
    }

    const payload = {
      user: userId,
      ...profileData,
    };

    payload.profileCompleted = this.calculateProfileCompletion(payload);

    const profile =
      await customerRepository.createProfile(payload);

    await this.syncUserFromProfile(userId, profile);

    return profile;
  }

  // ======================================
  // Get Customer Profile
  // ======================================

  async getProfile(userId) {

    const profile =
      await customerRepository.findProfileByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Customer profile not found."
      );
    }

    return profile;
  }

  // ======================================
  // Update Customer Profile
  // ======================================

  async updateProfile(userId, updateData) {

    const profile =
      await customerRepository.findProfileByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Customer profile not found."
      );
    }

    const merged = {
      fullName: updateData.fullName ?? profile.fullName,
      phone: updateData.phone ?? profile.phone,
      gender: updateData.gender ?? profile.gender,
      dateOfBirth: updateData.dateOfBirth ?? profile.dateOfBirth,
    };

    updateData.profileCompleted =
      this.calculateProfileCompletion(merged);

    const updated = await customerRepository.updateProfile(
      userId,
      updateData
    );

    await this.syncUserFromProfile(userId, updated);

    return updated;
  }

  // ======================================
  // Delete Customer Profile
  // ======================================

  async deleteProfile(userId) {

    const profile =
      await customerRepository.findProfileByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Customer profile not found."
      );
    }

    await customerRepository.softDeleteProfile(userId);

    return {
      message: "Customer profile deleted successfully.",
    };
  }

  // ======================================
  // Update Avatar
  // ======================================

  async updateAvatar(userId, avatarUrl) {

    const profile =
      await customerRepository.findProfileByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Customer profile not found."
      );
    }

    const updated = await customerRepository.updateAvatar(
      userId,
      avatarUrl
    );

    await this.syncUserFromProfile(userId, updated);

    return updated;
  }

  // ======================================
  // Delete Avatar
  // ======================================

  async deleteAvatar(userId) {

    const profile =
      await customerRepository.findProfileByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Customer profile not found."
      );
    }

    return await customerRepository.deleteAvatar(userId);
  }

  // ======================================
  // Update Addresses
  // ======================================

  async updateAddresses(userId, addresses) {

    const profile =
      await customerRepository.findProfileByUserId(userId);

    if (!profile) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Customer profile not found."
      );
    }

    return await customerRepository.updateAddresses(
      userId,
      addresses
    );
  }
  // Profile Completion

  calculateProfileCompletion(profile) {

    const fields = [
      profile.fullName,
      profile.phone,
      profile.gender,
      profile.dateOfBirth,
    ];

    const completedFields =
      fields.filter(Boolean).length;

    const percentage =
      (completedFields / fields.length) * 100;

    return percentage === 100;
  }

  async addAddress(userId,address){

return await customerRepository.addAddress(

userId,

address

);

}

async getAddresses(userId){

return await customerRepository.getAddresses(

userId

);

}

// Update Address
async updateAddress(

userId,

addressId,

address

){

return await customerRepository.updateAddress(

userId,

addressId,

address

);

}

// Delete Address
async deleteAddress(

userId,

addressId

){

return await customerRepository.deleteAddress(

userId,

addressId

);

}

 // =====================================================
  // Dashboard Module
  // =====================================================

  async getDashboard(userId) {

    const [

      profile,

      statistics,

      recentBookings,

      upcomingBookings,

      unreadNotifications,

      recentNotifications,

      favoriteCategory,

      totalSpent,

    ] = await Promise.all([

      customerRepository.getDashboardProfile(userId),

      customerRepository.getBookingStatistics(userId),

      customerRepository.getRecentBookings(userId),

      customerRepository.getUpcomingBookings(userId),

      customerRepository.getUnreadNotifications(userId),

      customerRepository.getRecentNotifications(userId),

      customerRepository.getFavoriteService(userId),

      customerRepository.getTotalRevenueSpent(userId),

    ]);

    if (!profile) {

      throw new ApiError(

        HTTP_STATUS.NOT_FOUND,

        "Customer profile not found."

      );

    }

    return {

      profile: {

        fullName: profile.fullName,

        avatar: profile.avatar,

        phone: profile.phone,

        profileCompletion:
          profile.profileCompletion || 0,

      },

      statistics: statistics || {

        totalBookings: 0,

        pendingBookings: 0,

        assignedBookings: 0,

        acceptedBookings: 0,

        inProgressBookings: 0,

        completedBookings: 0,

        cancelledBookings: 0,

        totalSpent: 0,

      },

      totalSpent,

      unreadNotifications,

      favoriteCategory:
        favoriteCategory?._id || null,

      recentBookings,

      upcomingBookings,

      recentNotifications,

    };

  }

  // =====================================================
  // Statistics API
  // =====================================================

  async getStatistics(userId) {

    const statistics =
      await customerRepository.getBookingStatistics(
        userId
      );

    return statistics || {

      totalBookings: 0,

      pendingBookings: 0,

      assignedBookings: 0,

      acceptedBookings: 0,

      inProgressBookings: 0,

      completedBookings: 0,

      cancelledBookings: 0,

      totalSpent: 0,

    };

  }

  // =====================================================
  // Recent Bookings
  // =====================================================

  async getRecentBookings(userId) {

    return await customerRepository.getRecentBookings(
      userId
    );

  }

  // =====================================================
  // Upcoming Bookings
  // =====================================================

  async getUpcomingBookings(userId) {

    return await customerRepository.getUpcomingBookings(
      userId
    );

  }

  // =====================================================
  // Notifications
  // =====================================================

  async getNotifications(userId) {
    const notificationService = (
      await import("./notification.service.js")
    ).default;

    return await notificationService.list(userId, {
      page: 1,
      limit: 20,
    });
  }

  // =====================================================
// Change Password
// =====================================================

async changePassword(userId, passwordData) {

    const {

        currentPassword,

        newPassword,

        confirmPassword

    } = passwordData;

    const user =
        await customerRepository.getUserWithPassword(userId);

    if (!user) {

        throw new ApiError(

            HTTP_STATUS.NOT_FOUND,

            "User not found."

        );

    }

    const isPasswordCorrect =
        await bcrypt.compare(
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

    const hashedPassword =
        await bcrypt.hash(newPassword, 10);

    await customerRepository.updatePassword(

        userId,

        hashedPassword

    );

    return {

        message: "Password changed successfully."

    };

}

// =====================================================
// Deactivate Account
// =====================================================

async deactivateAccount(userId) {

    const profile =
        await customerRepository.findProfileByUserId(userId);

    if (!profile) {

        throw new ApiError(

            HTTP_STATUS.NOT_FOUND,

            "Customer profile not found."

        );

    }

    await customerRepository.deactivateAccount(userId);

    return {

        message: "Account deactivated successfully."

    };
  }

  // =====================================================
// Delete Account
// =====================================================

async deleteAccount(userId) {

    const profile =
        await customerRepository.findProfileByUserId(userId);

    if (!profile) {

        throw new ApiError(

            HTTP_STATUS.NOT_FOUND,

            "Customer profile not found."

        );

    }

    await customerRepository.deleteAccount(userId);

    return {

        message: "Account deleted successfully."

    };

}

// =====================================================
// Logout All Devices
// =====================================================

async logoutAllDevices(userId) {

    await customerRepository.logoutAllDevices(userId);

    return {

        message: "Logged out from all devices successfully."

    };

}

// =====================================================
// Update Preferences
// =====================================================

async updatePreferences(

    userId,

    preferences

) {

    const profile =
        await customerRepository.updatePreferences(

            userId,

            preferences

        );

    if (!profile) {

        throw new ApiError(

            HTTP_STATUS.NOT_FOUND,

            "Customer profile not found."

        );

    }

    return profile.preferences;

}

// =====================================================
// Get Preferences
// =====================================================

async getPreferences(userId) {

    const profile =
        await customerRepository.getPreferences(userId);

    if (!profile) {

        throw new ApiError(

            HTTP_STATUS.NOT_FOUND,

            "Customer profile not found."

        );

    }

    return profile.preferences;

}

// =====================================================
// Update Privacy
// =====================================================

async updatePrivacy(

    userId,

    privacy

) {

    const profile =
        await customerRepository.updatePrivacy(

            userId,

            privacy

        );

    if (!profile) {

        throw new ApiError(

            HTTP_STATUS.NOT_FOUND,

            "Customer profile not found."

        );

    }

    return profile.privacy;

}

// =====================================================
// Get Privacy
// =====================================================

async getPrivacy(userId) {

    const profile =
        await customerRepository.getPrivacy(userId);

    if (!profile) {

        throw new ApiError(

            HTTP_STATUS.NOT_FOUND,

            "Customer profile not found."

        );

    }

    return profile.privacy;

}

  // =====================================================
  // Pagination Helpers
  // =====================================================

  parsePagination(query = {}) {
    let page = parseInt(query.page, 10);
    let limit = parseInt(query.limit, 10);

    if (Number.isNaN(page) || page < 1) {
      page = PAGINATION.DEFAULT_PAGE;
    }

    if (Number.isNaN(limit) || limit < PAGINATION.MIN_LIMIT) {
      limit = PAGINATION.DEFAULT_LIMIT;
    }

    if (limit > PAGINATION.MAX_LIMIT) {
      limit = PAGINATION.MAX_LIMIT;
    }

    return { page, limit };
  }

  parseSort(query = {}) {
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "fullName",
      "lastProfileUpdated",
      "profileCompleted",
    ];

    const sortBy = allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : "createdAt";

    const sortOrder =
      query.sortOrder === "asc" ? "asc" : "desc";

    return { sortBy, sortOrder };
  }

  formatPaginatedResponse(items, page, limit, total) {
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

  async writeAuditLog({
    actorId,
    action,
    resource = "CustomerProfile",
    description,
    metadata = {},
    ipAddress,
    userAgent,
  }) {
    try {
      await auditRepository.create({
        actor: actorId,
        action,
        resource,
        description,
        metadata,
        ipAddress,
        userAgent,
      });
    } catch {
      // Audit failures must not block the main API response
    }
  }

  // =====================================================
  // Search Customers (Admin)
  // =====================================================

  async searchCustomers(query, actor = {}) {
    const { page, limit } = this.parsePagination(query);
    const { sortBy, sortOrder } = this.parseSort(query);

    const search = query.q || query.search || "";

    if (!search.trim()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Search query (q) is required."
      );
    }

    const { customers, total } =
      await customerRepository.searchCustomers({
        search: search.trim(),
        page,
        limit,
        sortBy,
        sortOrder,
      });

    await this.writeAuditLog({
      actorId: actor.userId,
      action: AUDIT_ACTION.SEARCH,
      description: "Admin searched customers",
      metadata: { search: search.trim(), page, limit },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return this.formatPaginatedResponse(
      customers,
      page,
      limit,
      total
    );
  }

  // =====================================================
  // Filter Customers (Admin)
  // =====================================================

  async filterCustomers(query, actor = {}) {
    const { page, limit } = this.parsePagination(query);
    const { sortBy, sortOrder } = this.parseSort(query);

    const { customers, total } =
      await customerRepository.searchCustomers({
        city: query.city,
        gender: query.gender,
        profileCompleted: query.profileCompleted,
        includeDeleted: query.includeDeleted,
        page,
        limit,
        sortBy,
        sortOrder,
      });

    await this.writeAuditLog({
      actorId: actor.userId,
      action: AUDIT_ACTION.FILTER,
      description: "Admin filtered customers",
      metadata: {
        city: query.city,
        gender: query.gender,
        profileCompleted: query.profileCompleted,
        includeDeleted: query.includeDeleted,
        page,
        limit,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return this.formatPaginatedResponse(
      customers,
      page,
      limit,
      total
    );
  }

  // =====================================================
  // Paginated Customer List (Admin)
  // =====================================================

  async listCustomers(query, actor = {}) {
    const { page, limit } = this.parsePagination(query);
    const { sortBy, sortOrder } = this.parseSort(query);

    const { customers, total } =
      await customerRepository.searchCustomers({
        search: query.q || query.search,
        city: query.city,
        gender: query.gender,
        profileCompleted: query.profileCompleted,
        includeDeleted: query.includeDeleted,
        page,
        limit,
        sortBy,
        sortOrder,
      });

    await this.writeAuditLog({
      actorId: actor.userId,
      action: AUDIT_ACTION.READ,
      description: "Admin listed customers",
      metadata: { page, limit, sortBy, sortOrder },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return this.formatPaginatedResponse(
      customers,
      page,
      limit,
      total
    );
  }

}

export default new CustomerService();