import bookingRepository from "../repositories/booking.repository.js";
import auditRepository from "../repositories/audit.repository.js";
import technicianDashboardRepository from "../repositories/technicianDashboard.repository.js";
import technicianRepository from "../repositories/technician.repository.js";
import BookingTimeline from "../models/BookingTimeline.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import PAGINATION from "../constants/pagination.js";
import AUDIT_ACTION from "../constants/auditAction.js";
import BOOKING_STATUS from "../constants/bookingStatus.js";
import cacheService, {
  CACHE_KEYS,
  CACHE_TTL,
} from "../utils/cache.js";

class TechnicianJobsService {
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

  parseSort(query = {}) {
    const allowed = [
      "createdAt",
      "updatedAt",
      "bookingDate",
      "amount",
      "status",
      "serviceCategory",
      "completedAt",
    ];

    return {
      sortBy: allowed.includes(query.sortBy) ? query.sortBy : "createdAt",
      sortOrder: query.sortOrder === "asc" ? "asc" : "desc",
    };
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

  buildJobQuery(query = {}) {
    const { page, limit } = this.parsePagination(query);
    const { sortBy, sortOrder } = this.parseSort(query);

    return {
      search: query.q || query.search,
      status: query.status,
      serviceCategory: query.category || query.serviceCategory,
      fromDate: query.fromDate || query.startDate,
      toDate: query.toDate || query.endDate,
      paymentStatus: query.paymentStatus,
      page,
      limit,
      sortBy,
      sortOrder,
    };
  }

  async writeAudit({
    actorId,
    action,
    description,
    metadata = {},
    ipAddress,
    userAgent,
  }) {
    try {
      await auditRepository.create({
        actor: actorId,
        action,
        resource: "TechnicianJob",
        description,
        metadata,
        ipAddress,
        userAgent,
      });
    } catch {
      // non-blocking
    }
  }

  // ======================================
  // List Jobs (pagination + filter + sort)
  // ======================================

  async listJobs(technicianId, query = {}, actorMeta = {}) {
    const options = this.buildJobQuery(query);
    const cacheKey = `${CACHE_KEYS.TECH_JOBS_PREFIX}list:${technicianId}:${JSON.stringify(options)}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) return { ...cached, cached: true };

    const { bookings, total } = options.search
      ? await bookingRepository.searchTechnicianJobs({
          technicianId,
          ...options,
        })
      : await bookingRepository.findByTechnician(technicianId, options);

    // Include open marketplace jobs (Pending, unassigned) matching technician skills
    let openItems = [];
    const wantsOpen =
      !options.status ||
      options.status === BOOKING_STATUS.PENDING ||
      String(options.status).toLowerCase() === "pending";

    if (wantsOpen && !options.search) {
      const technician = await technicianRepository.findById(technicianId);
      const { bookings: openBookings } =
        await bookingRepository.findOpenJobsForTechnician({
          skills: technician?.skills || [],
          city: technician?.city || "",
          page: 1,
          limit: Math.min(options.limit * 2, 40),
          sortBy: options.sortBy,
          sortOrder: options.sortOrder,
        });
      openItems = (openBookings || []).map((job) => ({
        ...job,
        isOpenOffer: true,
      }));
    }

    const mergedMap = new Map();
    for (const job of [...openItems, ...bookings]) {
      mergedMap.set(String(job._id), job);
    }
    const merged = [...mergedMap.values()].sort((a, b) => {
      const da = new Date(a.createdAt || a.bookingDate || 0).getTime();
      const db = new Date(b.createdAt || b.bookingDate || 0).getTime();
      return options.sortOrder === "asc" ? da - db : db - da;
    });

    const pageItems = merged.slice(0, options.limit);
    const result = this.formatPaginatedResponse(
      pageItems,
      options.page,
      options.limit,
      total + openItems.length
    );

    await cacheService.set(cacheKey, result, CACHE_TTL.LIST);

    await this.writeAudit({
      actorId: technicianId,
      action: AUDIT_ACTION.READ,
      description: "Technician listed jobs",
      metadata: options,
      ...actorMeta,
    });

    return { ...result, cached: false };
  }

  // ======================================
  // Search Jobs
  // ======================================

  async searchJobs(technicianId, query = {}, actorMeta = {}) {
    const search = query.q || query.search || "";

    if (!search.trim()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Search query (q) is required."
      );
    }

    const options = this.buildJobQuery(query);
    const { bookings, total } =
      await bookingRepository.searchTechnicianJobs({
        technicianId,
        ...options,
        search: search.trim(),
      });

    await this.writeAudit({
      actorId: technicianId,
      action: AUDIT_ACTION.SEARCH,
      description: "Technician searched jobs",
      metadata: { ...options, search: search.trim() },
      ...actorMeta,
    });

    return this.formatPaginatedResponse(
      bookings,
      options.page,
      options.limit,
      total
    );
  }

  // ======================================
  // Filter Jobs
  // ======================================

  async filterJobs(technicianId, query = {}, actorMeta = {}) {
    const options = this.buildJobQuery(query);

    if (
      !options.status &&
      !options.serviceCategory &&
      !options.fromDate &&
      !options.toDate &&
      !options.paymentStatus
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "At least one filter is required (status, category, fromDate, toDate, or paymentStatus)."
      );
    }

    const { bookings, total } =
      await bookingRepository.searchTechnicianJobs({
        technicianId,
        ...options,
      });

    await this.writeAudit({
      actorId: technicianId,
      action: AUDIT_ACTION.FILTER,
      description: "Technician filtered jobs",
      metadata: options,
      ...actorMeta,
    });

    return this.formatPaginatedResponse(
      bookings,
      options.page,
      options.limit,
      total
    );
  }

  // ======================================
  // Activity History (timeline events by technician)
  // ======================================

  async getActivityHistory(technicianId, query = {}) {
    const { page, limit } = this.parsePagination(query);
    const skip = (page - 1) * limit;

    const filter = { actor: technicianId };
    if (query.event) filter.event = query.event;

    const [items, total] = await Promise.all([
      BookingTimeline.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("booking", "serviceCategory serviceName status bookingDate")
        .lean(),
      BookingTimeline.countDocuments(filter),
    ]);

    return this.formatPaginatedResponse(items, page, limit, total);
  }

  // ======================================
  // Audit Logs (technician's own actions)
  // ======================================

  async getAuditLogs(technicianId, query = {}) {
    const { page, limit } = this.parsePagination(query);

    const { logs, total } = await auditRepository.findByActor(
      technicianId,
      { page, limit }
    );

    return this.formatPaginatedResponse(logs, page, limit, total);
  }

  // ======================================
  // Performance Reports
  // ======================================

  async getPerformanceReport(technicianId, query = {}) {
    const now = new Date();
    const fromDate = query.fromDate
      ? new Date(query.fromDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = query.toDate ? new Date(query.toDate) : now;

    if (toDate < fromDate) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "toDate must be after fromDate."
      );
    }

    const cacheKey = `${CACHE_KEYS.TECH_REPORT_PREFIX}${technicianId}:${fromDate.toISOString()}:${toDate.toISOString()}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return { ...cached, cached: true };

    const [performance, categoryBreakdown, statistics] =
      await Promise.all([
        technicianDashboardRepository.getPerformance(
          technicianId,
          fromDate,
          toDate
        ),
        technicianDashboardRepository.getCategoryBreakdown(technicianId),
        technicianDashboardRepository.getJobStatistics(technicianId),
      ]);

    const completed = performance.summary.completedJobs || 0;
    const total = performance.summary.totalJobs || 0;
    const completionRate =
      total === 0 ? 0 : Number(((completed / total) * 100).toFixed(2));

    const report = {
      period: { from: fromDate, to: toDate },
      summary: {
        totalJobs: total,
        completedJobs: completed,
        activeJobs: performance.summary.activeJobs || 0,
        earnings: performance.summary.earnings || 0,
        completionRate,
      },
      lifetime: {
        totalJobs: statistics.totalJobs || 0,
        completedJobs: statistics.completedJobs || 0,
        totalEarnings: statistics.totalEarnings || 0,
      },
      dailyBreakdown: performance.dailyBreakdown,
      categoryBreakdown: categoryBreakdown.map((item) => ({
        category: item._id,
        count: item.count,
        earnings: item.earnings,
      })),
    };

    await cacheService.set(cacheKey, report, CACHE_TTL.REPORT);
    return { ...report, cached: false };
  }
}

export default new TechnicianJobsService();
