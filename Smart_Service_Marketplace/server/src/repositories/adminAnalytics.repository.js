import User from "../models/User.js";
import TechnicianProfile from "../models/TechnicianProfile.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import Review from "../models/Review.js";
import ROLES from "../constants/roles.js";
import BOOKING_STATUS from "../constants/bookingStatus.js";
import PAYMENT_STATUS from "../constants/paymentStatus.js";
import TECHNICIAN_APPLICATION_STATUS from "../constants/technicianApplication.js";
import { REVIEW_STATUS } from "../constants/review.js";

const ACTIVE_BOOKING_STATUSES = [
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.PAUSED,
];

const COMPLETED_BOOKING_STATUSES = [
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.CLOSED,
];

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return end;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthRange(months = 12) {
  const now = new Date();
  const range = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    range.push({
      key: monthKey(date),
      label: date.toLocaleString("en-US", { month: "short", year: "numeric" }),
      start: startOfMonth(date),
      end: endOfMonth(date),
    });
  }

  return range;
}

class AdminAnalyticsRepository {
  async getUserMetrics() {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const baseFilter = {
      role: { $ne: ROLES.ADMIN },
      isDeleted: false,
    };

    const [
      totalUsers,
      activeUsers,
      totalCustomers,
      activeCustomers,
      totalTechnicians,
      activeTechniciansAgg,
      newUsersThisMonth,
      recentlyActiveUsers,
      pendingTechnicianApplications,
    ] = await Promise.all([
      User.countDocuments(baseFilter),
      User.countDocuments({ ...baseFilter, isActive: true }),
      User.countDocuments({ role: ROLES.CUSTOMER, isDeleted: false }),
      User.countDocuments({
        role: ROLES.CUSTOMER,
        isActive: true,
        isDeleted: false,
      }),
      User.countDocuments({ role: ROLES.TECHNICIAN, isDeleted: false }),
      TechnicianProfile.aggregate([
        {
          $match: {
            applicationStatus: TECHNICIAN_APPLICATION_STATUS.APPROVED,
            isSuspended: false,
            isDeleted: false,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userDoc",
          },
        },
        { $unwind: "$userDoc" },
        {
          $match: {
            "userDoc.isActive": true,
            "userDoc.isDeleted": false,
          },
        },
        { $count: "count" },
      ]),
      User.countDocuments({
        ...baseFilter,
        createdAt: { $gte: startOfCurrentMonth },
      }),
      User.countDocuments({
        ...baseFilter,
        isActive: true,
        lastLogin: { $gte: thirtyDaysAgo },
      }),
      TechnicianProfile.countDocuments({
        applicationStatus: TECHNICIAN_APPLICATION_STATUS.PENDING,
        isDeleted: false,
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalCustomers,
      activeCustomers,
      totalTechnicians,
      activeTechnicians: activeTechniciansAgg[0]?.count || 0,
      newUsersThisMonth,
      recentlyActiveUsers,
      pendingTechnicianApplications,
    };
  }

  async getBookingMetrics() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfCurrentMonth = startOfMonth(now);

    const [
      totalBookings,
      activeBookings,
      completedBookings,
      bookingsToday,
      bookingsThisMonth,
      techniciansOnJob,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: { $in: ACTIVE_BOOKING_STATUSES } }),
      Booking.countDocuments({ status: { $in: COMPLETED_BOOKING_STATUSES } }),
      Booking.countDocuments({ createdAt: { $gte: startOfToday } }),
      Booking.countDocuments({ createdAt: { $gte: startOfCurrentMonth } }),
      Booking.distinct("technician", {
        technician: { $ne: null },
        status: {
          $in: [
            BOOKING_STATUS.ASSIGNED,
            BOOKING_STATUS.ACCEPTED,
            BOOKING_STATUS.IN_PROGRESS,
          ],
        },
      }),
    ]);

    return {
      totalBookings,
      activeBookings,
      completedBookings,
      bookingsToday,
      bookingsThisMonth,
      techniciansOnJob: techniciansOnJob.length,
    };
  }

  async getRevenueMetrics({ from, to } = {}) {
    const match = {};
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const [overview] = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          revenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", PAYMENT_STATUS.PAID] },
                "$amount",
                0,
              ],
            },
          },
          paidCount: {
            $sum: {
              $cond: [{ $eq: ["$status", PAYMENT_STATUS.PAID] }, 1, 0],
            },
          },
          refundedCount: {
            $sum: {
              $cond: [
                { $eq: ["$status", PAYMENT_STATUS.REFUNDED] },
                1,
                0,
              ],
            },
          },
          refundedAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", PAYMENT_STATUS.REFUNDED] },
                "$refundedAmount",
                0,
              ],
            },
          },
          bookingRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$purpose", "booking"] },
                    { $eq: ["$status", PAYMENT_STATUS.PAID] },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
        },
      },
    ]);

    const stats = overview || {
      revenue: 0,
      paidCount: 0,
      refundedCount: 0,
      refundedAmount: 0,
      bookingRevenue: 0,
    };

    return {
      revenue: stats.revenue,
      paidTransactions: stats.paidCount,
      bookingRevenue: stats.bookingRevenue,
      refunds: {
        count: stats.refundedCount,
        amount: stats.refundedAmount,
      },
      netRevenue: Number((stats.revenue - stats.refundedAmount).toFixed(2)),
    };
  }

  async getRatingMetrics() {
    const [stats] = await Review.aggregate([
      {
        $match: {
          status: REVIEW_STATUS.APPROVED,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    return {
      averageRating: stats
        ? Number(stats.averageRating.toFixed(2))
        : 0,
      totalReviews: stats?.totalReviews || 0,
    };
  }

  async getGrowthCharts({ months = 12 } = {}) {
    const monthRange = buildMonthRange(months);
    const fromDate = monthRange[0].start;

    const [userGrowth, technicianGrowth, bookingGrowth, revenueGrowth, refundGrowth, ratingGrowth] =
      await Promise.all([
        User.aggregate([
          {
            $match: {
              role: { $ne: ROLES.ADMIN },
              isDeleted: false,
              createdAt: { $gte: fromDate },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$createdAt" },
              },
              newUsers: { $sum: 1 },
              activeUsers: {
                $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        User.aggregate([
          {
            $match: {
              role: ROLES.TECHNICIAN,
              isDeleted: false,
              createdAt: { $gte: fromDate },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$createdAt" },
              },
              newTechnicians: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Booking.aggregate([
          { $match: { createdAt: { $gte: fromDate } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$createdAt" },
              },
              totalBookings: { $sum: 1 },
              completedBookings: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        "$status",
                        COMPLETED_BOOKING_STATUSES,
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Payment.aggregate([
          {
            $match: {
              createdAt: { $gte: fromDate },
              status: PAYMENT_STATUS.PAID,
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$createdAt" },
              },
              revenue: { $sum: "$amount" },
              transactions: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Payment.aggregate([
          {
            $match: {
              createdAt: { $gte: fromDate },
              status: PAYMENT_STATUS.REFUNDED,
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$createdAt" },
              },
              refundCount: { $sum: 1 },
              refundAmount: { $sum: "$refundedAmount" },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Review.aggregate([
          {
            $match: {
              status: REVIEW_STATUS.APPROVED,
              isDeleted: false,
              createdAt: { $gte: fromDate },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$createdAt" },
              },
              averageRating: { $avg: "$rating" },
              reviewCount: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    const toMap = (rows) =>
      rows.reduce((acc, row) => {
        acc[row._id] = row;
        return acc;
      }, {});

    const usersMap = toMap(userGrowth);
    const techniciansMap = toMap(technicianGrowth);
    const bookingsMap = toMap(bookingGrowth);
    const revenueMap = toMap(revenueGrowth);
    const refundsMap = toMap(refundGrowth);
    const ratingsMap = toMap(ratingGrowth);

    let cumulativeUsers = 0;
    let cumulativeTechnicians = 0;

    const charts = monthRange.map((month) => {
      const users = usersMap[month.key] || {};
      const technicians = techniciansMap[month.key] || {};
      const bookings = bookingsMap[month.key] || {};
      const revenue = revenueMap[month.key] || {};
      const refunds = refundsMap[month.key] || {};
      const ratings = ratingsMap[month.key] || {};

      cumulativeUsers += users.newUsers || 0;
      cumulativeTechnicians += technicians.newTechnicians || 0;

      return {
        month: month.key,
        label: month.label,
        users: {
          new: users.newUsers || 0,
          active: users.activeUsers || 0,
          cumulative: cumulativeUsers,
        },
        technicians: {
          new: technicians.newTechnicians || 0,
          cumulative: cumulativeTechnicians,
        },
        bookings: {
          total: bookings.totalBookings || 0,
          completed: bookings.completedBookings || 0,
        },
        revenue: {
          amount: revenue.revenue || 0,
          transactions: revenue.transactions || 0,
        },
        refunds: {
          count: refunds.refundCount || 0,
          amount: refunds.refundAmount || 0,
        },
        ratings: {
          average: ratings.averageRating
            ? Number(ratings.averageRating.toFixed(2))
            : null,
          count: ratings.reviewCount || 0,
        },
      };
    });

    return {
      months: monthRange.length,
      from: monthRange[0].key,
      to: monthRange[monthRange.length - 1].key,
      charts,
    };
  }

  async getMonthlyReports({ year, months = 12 } = {}) {
    let monthRange;

    if (year) {
      const y = Number(year);
      monthRange = Array.from({ length: 12 }, (_, index) => {
        const date = new Date(y, index, 1);
        return {
          key: monthKey(date),
          label: date.toLocaleString("en-US", { month: "long", year: "numeric" }),
          start: startOfMonth(date),
          end: endOfMonth(date),
        };
      });
    } else {
      monthRange = buildMonthRange(months);
    }

    const fromDate = monthRange[0].start;
    const toDate = monthRange[monthRange.length - 1].end;

    const [
      usersByMonth,
      techniciansByMonth,
      bookingsByMonth,
      revenueByMonth,
      refundsByMonth,
      ratingsByMonth,
    ] = await Promise.all([
      User.aggregate([
        {
          $match: {
            role: { $ne: ROLES.ADMIN },
            isDeleted: false,
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m", date: "$createdAt" },
            },
            newUsers: { $sum: 1 },
            newCustomers: {
              $sum: {
                $cond: [{ $eq: ["$role", ROLES.CUSTOMER] }, 1, 0],
              },
            },
          },
        },
      ]),
      TechnicianProfile.aggregate([
        {
          $match: {
            isDeleted: false,
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m", date: "$createdAt" },
            },
            newApplications: { $sum: 1 },
            approved: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$applicationStatus",
                      TECHNICIAN_APPLICATION_STATUS.APPROVED,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
        {
          $group: {
            _id: {
              month: {
                $dateToString: { format: "%Y-%m", date: "$createdAt" },
              },
              status: "$status",
            },
            count: { $sum: 1 },
            revenue: { $sum: "$amount" },
          },
        },
      ]),
      Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: fromDate, $lte: toDate },
            status: PAYMENT_STATUS.PAID,
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m", date: "$createdAt" },
            },
            revenue: { $sum: "$amount" },
            transactions: { $sum: 1 },
          },
        },
      ]),
      Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: fromDate, $lte: toDate },
            status: PAYMENT_STATUS.REFUNDED,
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m", date: "$createdAt" },
            },
            count: { $sum: 1 },
            amount: { $sum: "$refundedAmount" },
          },
        },
      ]),
      Review.aggregate([
        {
          $match: {
            status: REVIEW_STATUS.APPROVED,
            isDeleted: false,
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m", date: "$createdAt" },
            },
            averageRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const mapRows = (rows, key = "_id") =>
      rows.reduce((acc, row) => {
        acc[row[key]] = row;
        return acc;
      }, {});

    const usersMap = mapRows(usersByMonth);
    const techniciansMap = mapRows(techniciansByMonth);
    const revenueMap = mapRows(revenueByMonth);
    const refundsMap = mapRows(refundsByMonth);
    const ratingsMap = mapRows(ratingsByMonth);

    const bookingsByMonthMap = {};
    for (const row of bookingsByMonth) {
      const month = row._id.month;
      if (!bookingsByMonthMap[month]) {
        bookingsByMonthMap[month] = {
          total: 0,
          revenue: 0,
          byStatus: {},
        };
      }
      bookingsByMonthMap[month].total += row.count;
      bookingsByMonthMap[month].revenue += row.revenue;
      bookingsByMonthMap[month].byStatus[row._id.status] = row.count;
    }

    const reports = monthRange.map((month) => {
      const users = usersMap[month.key] || {};
      const technicians = techniciansMap[month.key] || {};
      const bookings = bookingsByMonthMap[month.key] || {
        total: 0,
        revenue: 0,
        byStatus: {},
      };
      const revenue = revenueMap[month.key] || {};
      const refunds = refundsMap[month.key] || {};
      const ratings = ratingsMap[month.key] || {};

      const completed =
        (bookings.byStatus[BOOKING_STATUS.COMPLETED] || 0) +
        (bookings.byStatus[BOOKING_STATUS.CLOSED] || 0);
      const active =
        (bookings.byStatus[BOOKING_STATUS.ASSIGNED] || 0) +
        (bookings.byStatus[BOOKING_STATUS.ACCEPTED] || 0) +
        (bookings.byStatus[BOOKING_STATUS.IN_PROGRESS] || 0) +
        (bookings.byStatus[BOOKING_STATUS.PAUSED] || 0);

      return {
        month: month.key,
        label: month.label,
        users: {
          newUsers: users.newUsers || 0,
          newCustomers: users.newCustomers || 0,
        },
        technicians: {
          newApplications: technicians.newApplications || 0,
          approved: technicians.approved || 0,
        },
        bookings: {
          total: bookings.total,
          active,
          completed,
          cancelled: bookings.byStatus[BOOKING_STATUS.CANCELLED] || 0,
          bookingRevenue: bookings.revenue,
          byStatus: bookings.byStatus,
        },
        revenue: {
          amount: revenue.revenue || 0,
          transactions: revenue.transactions || 0,
          net: Number(
            ((revenue.revenue || 0) - (refunds.amount || 0)).toFixed(2)
          ),
        },
        refunds: {
          count: refunds.count || 0,
          amount: refunds.amount || 0,
        },
        ratings: {
          average: ratings.averageRating
            ? Number(ratings.averageRating.toFixed(2))
            : null,
          count: ratings.reviewCount || 0,
        },
      };
    });

    const totals = reports.reduce(
      (acc, report) => {
        acc.newUsers += report.users.newUsers;
        acc.bookings += report.bookings.total;
        acc.completedBookings += report.bookings.completed;
        acc.revenue += report.revenue.amount;
        acc.refunds += report.refunds.amount;
        acc.reviewCount += report.ratings.count;
        return acc;
      },
      {
        newUsers: 0,
        bookings: 0,
        completedBookings: 0,
        revenue: 0,
        refunds: 0,
        reviewCount: 0,
      }
    );

    return {
      period: {
        from: monthRange[0].key,
        to: monthRange[monthRange.length - 1].key,
        year: year ? Number(year) : null,
        months: monthRange.length,
      },
      totals: {
        ...totals,
        netRevenue: Number((totals.revenue - totals.refunds).toFixed(2)),
      },
      reports,
    };
  }
}

export default new AdminAnalyticsRepository();
