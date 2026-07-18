import technicianDashboardRepository from "../repositories/technicianDashboard.repository.js";
import technicianRepository from "../repositories/technician.repository.js";
import technicianProfileService from "./technicianProfile.service.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import BOOKING_STATUS from "../constants/bookingStatus.js";
import cacheService, {
  CACHE_TTL,
} from "../utils/cache.js";

class TechnicianDashboardService {
  getWeekRange(now = new Date()) {
    const start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday start
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  getMonthRange(now = new Date()) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  // ======================================
  // Technician Dashboard
  // ======================================

  async getDashboard(technicianId) {
    const cacheKey = `technicians:dashboard:${technicianId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const week = this.getWeekRange();
    const month = this.getMonthRange();

    const [
      profileSummary,
      statistics,
      weeklyPerformance,
      monthlyPerformance,
      currentWorkload,
      pendingRequests,
      activeJobs,
      recentCompleted,
      upcomingJobs,
      categoryBreakdown,
    ] = await Promise.all([
      technicianDashboardRepository.getProfileSummary(technicianId),
      technicianDashboardRepository.getJobStatistics(technicianId),
      technicianDashboardRepository.getPerformance(
        technicianId,
        week.start,
        week.end
      ),
      technicianDashboardRepository.getPerformance(
        technicianId,
        month.start,
        month.end
      ),
      technicianRepository.getWorkload(technicianId),
      technicianDashboardRepository.getRecentJobs(
        technicianId,
        [BOOKING_STATUS.ASSIGNED],
        5
      ),
      technicianDashboardRepository.getRecentJobs(
        technicianId,
        [
          BOOKING_STATUS.ACCEPTED,
          BOOKING_STATUS.IN_PROGRESS,
          BOOKING_STATUS.PAUSED,
        ],
        5
      ),
      technicianDashboardRepository.getRecentJobs(
        technicianId,
        [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CLOSED],
        5
      ),
      technicianDashboardRepository.getUpcomingJobs(technicianId, 5),
      technicianDashboardRepository.getCategoryBreakdown(technicianId),
    ]);

    if (!profileSummary.user) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Technician not found."
      );
    }

    const { user, profile } = profileSummary;
    const maxWorkload = user.maxWorkload || 5;
    const rating = profile?.rating ?? user.rating ?? 5;

    const activeJobsCount =
      (statistics.acceptedJobs || 0) +
      (statistics.inProgressJobs || 0) +
      (statistics.pausedJobs || 0);

    const dashboard = {
      profile: {
        name: profile?.fullName || user.name,
        email: user.email,
        phone: profile?.phone || user.phone,
        avatar: profile?.profilePhoto || user.avatar,
        workingCity: profile?.workingCity || user.city,
        availability:
          profile?.availabilityStatus ?? user.availability ?? true,
        skills: profile?.skills?.length
          ? profile.skills
          : user.skills || [],
        experienceYears: profile?.experienceYears ?? 0,
        profileCompleted: profile?.profileCompleted ?? false,
        profileCompletion: technicianProfileService.getProfileCompletionPercent(
          profile || {}
        ),
      },

      overview: {
        assignedJobs: statistics.assignedJobs || 0,
        activeJobs: activeJobsCount,
        completedJobs: statistics.completedJobs || 0,
        pendingRequests: statistics.assignedJobs || 0,
        totalJobs: statistics.totalJobs || 0,
        currentWorkload,
        maxWorkload,
        remainingCapacity: Math.max(maxWorkload - currentWorkload, 0),
      },

      earnings: {
        total: statistics.totalEarnings || 0,
        pending: statistics.pendingEarnings || 0,
        weekly: weeklyPerformance.summary.earnings || 0,
        monthly: monthlyPerformance.summary.earnings || 0,
      },

      ratings: {
        average: rating,
        totalJobsCompleted:
          profile?.totalJobsCompleted ?? statistics.completedJobs ?? 0,
      },

      weeklyPerformance: {
        period: {
          from: week.start,
          to: week.end,
        },
        totalJobs: weeklyPerformance.summary.totalJobs || 0,
        completedJobs: weeklyPerformance.summary.completedJobs || 0,
        activeJobs: weeklyPerformance.summary.activeJobs || 0,
        earnings: weeklyPerformance.summary.earnings || 0,
        dailyBreakdown: weeklyPerformance.dailyBreakdown,
      },

      monthlyPerformance: {
        period: {
          from: month.start,
          to: month.end,
        },
        totalJobs: monthlyPerformance.summary.totalJobs || 0,
        completedJobs: monthlyPerformance.summary.completedJobs || 0,
        activeJobs: monthlyPerformance.summary.activeJobs || 0,
        earnings: monthlyPerformance.summary.earnings || 0,
        dailyBreakdown: monthlyPerformance.dailyBreakdown,
      },

      categoryBreakdown: categoryBreakdown.map((item) => ({
        category: item._id,
        count: item.count,
        earnings: item.earnings,
      })),

      lists: {
        pendingRequests,
        activeJobs,
        recentCompleted,
        upcomingJobs,
      },
    };

    await cacheService.set(cacheKey, dashboard, CACHE_TTL.ANALYTICS);
    return { ...dashboard, cached: false };
  }
}

export default new TechnicianDashboardService();
