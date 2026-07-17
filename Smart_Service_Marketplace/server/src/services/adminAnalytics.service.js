import adminAnalyticsRepository from "../repositories/adminAnalytics.repository.js";
import bookingAnalyticsService from "./bookingAnalytics.service.js";
import cacheService, { CACHE_KEYS, CACHE_TTL } from "../utils/cache.js";

class AdminAnalyticsService {
  parsePeriod(query = {}) {
    return {
      from: query.from || query.fromDate || query.startDate || null,
      to: query.to || query.toDate || query.endDate || null,
    };
  }

  async getDashboardMetrics(query = {}) {
    const period = this.parsePeriod(query);
    const cacheKey = `${CACHE_KEYS.ADMIN_ANALYTICS_DASHBOARD}:${period.from || "all"}:${period.to || "all"}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const [users, bookings, revenue, ratings, bookingDashboard] =
      await Promise.all([
        adminAnalyticsRepository.getUserMetrics(),
        adminAnalyticsRepository.getBookingMetrics(),
        adminAnalyticsRepository.getRevenueMetrics(period),
        adminAnalyticsRepository.getRatingMetrics(),
        bookingAnalyticsService.getDashboardAnalytics(),
      ]);

    const payload = {
      generatedAt: new Date().toISOString(),
      period,
      metrics: {
        totalUsers: users.totalUsers,
        activeUsers: users.activeUsers,
        recentlyActiveUsers: users.recentlyActiveUsers,
        newUsersThisMonth: users.newUsersThisMonth,
        totalCustomers: users.totalCustomers,
        activeCustomers: users.activeCustomers,
        totalTechnicians: users.totalTechnicians,
        activeTechnicians: users.activeTechnicians,
        techniciansOnJob: bookings.techniciansOnJob,
        pendingTechnicianApplications: users.pendingTechnicianApplications,
        totalBookings: bookings.totalBookings,
        activeBookings: bookings.activeBookings,
        completedBookings: bookings.completedBookings,
        bookingsToday: bookings.bookingsToday,
        bookingsThisMonth: bookings.bookingsThisMonth,
        revenue: revenue.revenue,
        netRevenue: revenue.netRevenue,
        bookingRevenue: revenue.bookingRevenue,
        paidTransactions: revenue.paidTransactions,
        refunds: revenue.refunds,
        averageRating: ratings.averageRating,
        totalReviews: ratings.totalReviews,
      },
      breakdown: {
        bookingsByStatus: bookingDashboard.byStatus,
        bookingsByCategory: bookingDashboard.byCategory,
        recentBookings: bookingDashboard.recentBookings,
      },
      cached: false,
    };

    await cacheService.set(cacheKey, payload, CACHE_TTL.ANALYTICS);
    return payload;
  }

  async getGrowthCharts(query = {}) {
    let months = parseInt(query.months, 10);
    if (Number.isNaN(months) || months < 1) months = 12;
    if (months > 24) months = 24;

    const cacheKey = `${CACHE_KEYS.ADMIN_ANALYTICS_GROWTH}:${months}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const growth = await adminAnalyticsRepository.getGrowthCharts({ months });
    const payload = { ...growth, cached: false };

    await cacheService.set(cacheKey, payload, CACHE_TTL.ANALYTICS);
    return payload;
  }

  async getMonthlyReports(query = {}) {
    let months = parseInt(query.months, 10);
    if (Number.isNaN(months) || months < 1) months = 12;
    if (months > 24) months = 24;

    const year = query.year ? parseInt(query.year, 10) : null;
    const cacheKey = `${CACHE_KEYS.ADMIN_ANALYTICS_MONTHLY}:${year || "rolling"}:${months}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const reports = await adminAnalyticsRepository.getMonthlyReports({
      year,
      months,
    });

    const payload = { ...reports, cached: false };
    await cacheService.set(cacheKey, payload, CACHE_TTL.REPORT);
    return payload;
  }
}

export default new AdminAnalyticsService();
