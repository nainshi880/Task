import dashboardStatisticsRepository from "../repositories/dashboardStatistics.repository.js";
import technicianDashboardRepository from "../repositories/technicianDashboard.repository.js";
import adminAnalyticsRepository from "../repositories/adminAnalytics.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import cacheService, { CACHE_TTL } from "../utils/cache.js";

class DashboardStatisticsService {
  async getCustomerStatistics(userId) {
    const cacheKey = `dashboard:statistics:customer:${userId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const statistics =
      await dashboardStatisticsRepository.getCustomerStatistics(userId);

    const payload = { statistics, cached: false };
    await cacheService.set(cacheKey, payload, CACHE_TTL.ANALYTICS);
    return payload;
  }

  async getTechnicianStatistics(technicianId) {
    const cacheKey = `dashboard:statistics:technician:${technicianId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const [profileSummary, jobStats] = await Promise.all([
      technicianDashboardRepository.getProfileSummary(technicianId),
      technicianDashboardRepository.getJobStatistics(technicianId),
    ]);

    if (!profileSummary.user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Technician not found.");
    }

    const { user, profile } = profileSummary;
    const rating = profile?.rating ?? user.rating ?? 5;

    const statistics = {
      earnings: jobStats?.totalEarnings || 0,
      pendingJobs: jobStats?.assignedJobs || 0,
      completedJobs: jobStats?.completedJobs || 0,
      rating: Number(rating.toFixed(2)),
    };

    const payload = { statistics, cached: false };
    await cacheService.set(cacheKey, payload, CACHE_TTL.ANALYTICS);
    return payload;
  }

  async getAdminStatistics(query = {}) {
    const period = {
      from: query.from || query.fromDate || null,
      to: query.to || query.toDate || null,
    };
    const cacheKey = `dashboard:statistics:admin:${period.from || "all"}:${period.to || "all"}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const [users, bookings, revenue] = await Promise.all([
      adminAnalyticsRepository.getUserMetrics(),
      adminAnalyticsRepository.getBookingMetrics(),
      adminAnalyticsRepository.getRevenueMetrics(period),
    ]);

    const statistics = {
      totalUsers: users.totalUsers,
      totalTechnicians: users.totalTechnicians,
      revenue: revenue.revenue || 0,
      activeBookings: bookings.activeBookings,
    };

    const payload = {
      statistics,
      period,
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    await cacheService.set(cacheKey, payload, CACHE_TTL.ANALYTICS);
    return payload;
  }
}

export default new DashboardStatisticsService();
