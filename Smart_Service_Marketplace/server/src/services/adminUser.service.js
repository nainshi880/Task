import adminUserRepository from "../repositories/adminUser.repository.js";
import auditRepository from "../repositories/audit.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import PAGINATION from "../constants/pagination.js";
import AUDIT_ACTION from "../constants/auditAction.js";
import ROLES from "../constants/roles.js";

class AdminUserService {
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

    const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

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

  buildQueryOptions(query) {
    const { page, limit } = this.parsePagination(query);
    const { sortBy, sortOrder } = this.parseSort(query);

    return {
      page,
      limit,
      sortBy,
      sortOrder,
      search: query.q || query.search,
      city: query.city,
      gender: query.gender,
      profileCompleted: query.profileCompleted,
      isActive: query.isActive,
      isVerified: query.isVerified,
      includeDeleted: query.includeDeleted,
    };
  }

  async writeAuditLog({
    actorId,
    action,
    resource = "User",
    resourceId,
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
        resourceId,
        description,
        metadata,
        ipAddress,
        userAgent,
      });
    } catch {
      // non-blocking
    }
  }

  assertManageableUser(targetUser, adminId) {
    if (!targetUser) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    if (targetUser._id.toString() === adminId.toString()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "You cannot perform this action on your own account."
      );
    }

    if (targetUser.role === ROLES.ADMIN || targetUser.role === ROLES.SUPER_ADMIN) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Admin accounts cannot be managed through this endpoint."
      );
    }
  }

  async listCustomers(query, actor = {}) {
    const options = this.buildQueryOptions(query);

    const { customers, total } =
      await adminUserRepository.findCustomers(options);

    await this.writeAuditLog({
      actorId: actor.userId,
      action: AUDIT_ACTION.READ,
      description: "Admin listed customers",
      metadata: { page: options.page, limit: options.limit },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return this.formatPaginatedResponse(
      customers,
      options.page,
      options.limit,
      total
    );
  }

  async searchCustomers(query, actor = {}) {
    const search = (query.q || query.search || "").trim();

    if (!search) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Search query (q) is required."
      );
    }

    const options = this.buildQueryOptions({ ...query, q: search });

    const { customers, total } =
      await adminUserRepository.findCustomers(options);

    await this.writeAuditLog({
      actorId: actor.userId,
      action: AUDIT_ACTION.SEARCH,
      description: "Admin searched customers",
      metadata: { search, page: options.page, limit: options.limit },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return this.formatPaginatedResponse(
      customers,
      options.page,
      options.limit,
      total
    );
  }

  async filterCustomers(query, actor = {}) {
    const hasFilter = [
      "city",
      "gender",
      "profileCompleted",
      "isActive",
      "isVerified",
      "includeDeleted",
    ].some((key) => query[key] !== undefined && query[key] !== "");

    if (!hasFilter) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "At least one filter parameter is required."
      );
    }

    const options = this.buildQueryOptions(query);

    const { customers, total } =
      await adminUserRepository.findCustomers(options);

    await this.writeAuditLog({
      actorId: actor.userId,
      action: AUDIT_ACTION.FILTER,
      description: "Admin filtered customers",
      metadata: {
        city: query.city,
        gender: query.gender,
        profileCompleted: query.profileCompleted,
        isActive: query.isActive,
        isVerified: query.isVerified,
        includeDeleted: query.includeDeleted,
        page: options.page,
        limit: options.limit,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return this.formatPaginatedResponse(
      customers,
      options.page,
      options.limit,
      total
    );
  }

  async getUserDetails(userId, actor = {}) {
    const details = await adminUserRepository.getUserDetails(userId);

    if (!details?.user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    await this.writeAuditLog({
      actorId: actor.userId,
      action: AUDIT_ACTION.READ,
      resource: "User",
      resourceId: userId,
      description: "Admin viewed user details",
      metadata: { targetUserId: userId, role: details.user.role },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return details;
  }

  async blockUser(userId, adminId, actor = {}) {
    const target = await adminUserRepository.findUserById(userId);
    this.assertManageableUser(target, adminId);

    if (!target.isActive) {
      return {
        user: target,
        message: "User is already blocked.",
      };
    }

    const user = await adminUserRepository.blockUser(userId);

    await this.writeAuditLog({
      actorId: adminId,
      action: AUDIT_ACTION.BLOCK,
      resource: "User",
      resourceId: userId,
      description: `Admin blocked user ${user.email}`,
      metadata: { targetUserId: userId, email: user.email },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      user,
      message: "User blocked successfully.",
    };
  }

  async unblockUser(userId, adminId, actor = {}) {
    const target = await adminUserRepository.findUserById(userId);
    this.assertManageableUser(target, adminId);

    if (target.isActive) {
      return {
        user: target,
        message: "User is already active.",
      };
    }

    const user = await adminUserRepository.unblockUser(userId);

    await this.writeAuditLog({
      actorId: adminId,
      action: AUDIT_ACTION.UNBLOCK,
      resource: "User",
      resourceId: userId,
      description: `Admin unblocked user ${user.email}`,
      metadata: { targetUserId: userId, email: user.email },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      user,
      message: "User unblocked successfully.",
    };
  }

  async deleteUser(userId, adminId, actor = {}) {
    const target = await adminUserRepository.findUserById(userId);
    this.assertManageableUser(target, adminId);

    if (target.isDeleted) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "User is already deleted."
      );
    }

    const user = await adminUserRepository.deleteUser(userId);

    await this.writeAuditLog({
      actorId: adminId,
      action: AUDIT_ACTION.DELETE,
      resource: "User",
      resourceId: userId,
      description: `Admin deleted user ${user.email}`,
      metadata: { targetUserId: userId, email: user.email },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      user,
      message: "User deleted successfully.",
    };
  }

  async getUserActivity(userId, query = {}, actor = {}) {
    const user = await adminUserRepository.findUserById(userId);

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    const { page, limit } = this.parsePagination(query);

    const [loginHistory, auditResult] = await Promise.all([
      adminUserRepository.getLoginHistory(userId, 20),
      auditRepository.findByUserActivity(userId, { page, limit }),
    ]);

    await this.writeAuditLog({
      actorId: actor.userId,
      action: AUDIT_ACTION.READ,
      resource: "User",
      resourceId: userId,
      description: "Admin viewed user activity logs",
      metadata: { targetUserId: userId, page, limit },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return {
      userId,
      loginHistory,
      auditLogs: auditResult.logs,
      pagination: {
        page,
        limit,
        total: auditResult.total,
        totalPages: Math.ceil(auditResult.total / limit) || 0,
      },
    };
  }
}

export default new AdminUserService();
