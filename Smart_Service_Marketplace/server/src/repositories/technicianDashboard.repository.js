import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import TechnicianProfile from "../models/TechnicianProfile.js";
import BOOKING_STATUS from "../constants/bookingStatus.js";

class TechnicianDashboardRepository {
  toObjectId(id) {
    return new mongoose.Types.ObjectId(id);
  }

  async getProfileSummary(technicianId) {
    const [user, profile] = await Promise.all([
      User.findOne({
        _id: technicianId,
        isDeleted: false,
      }).select(
        "name email phone city avatar availability rating skills maxWorkload"
      ),
      TechnicianProfile.findOne({
        user: technicianId,
        isDeleted: false,
      }).select(
        "fullName profilePhoto workingCity rating experienceYears availabilityStatus skills serviceCategories profileCompleted totalJobsCompleted"
      ),
    ]);

    return { user, profile };
  }

  async getJobStatistics(technicianId) {
    const techId = this.toObjectId(technicianId);

    const [stats] = await Booking.aggregate([
      {
        $match: {
          technician: techId,
        },
      },
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          assignedJobs: {
            $sum: {
              $cond: [
                { $eq: ["$status", BOOKING_STATUS.ASSIGNED] },
                1,
                0,
              ],
            },
          },
          acceptedJobs: {
            $sum: {
              $cond: [
                { $eq: ["$status", BOOKING_STATUS.ACCEPTED] },
                1,
                0,
              ],
            },
          },
          inProgressJobs: {
            $sum: {
              $cond: [
                { $eq: ["$status", BOOKING_STATUS.IN_PROGRESS] },
                1,
                0,
              ],
            },
          },
          pausedJobs: {
            $sum: {
              $cond: [
                { $eq: ["$status", BOOKING_STATUS.PAUSED] },
                1,
                0,
              ],
            },
          },
          completedJobs: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CLOSED],
                  ],
                },
                1,
                0,
              ],
            },
          },
          closedJobs: {
            $sum: {
              $cond: [
                { $eq: ["$status", BOOKING_STATUS.CLOSED] },
                1,
                0,
              ],
            },
          },
          rejectedJobs: {
            $sum: {
              $cond: [
                { $ne: ["$rejectionReason", null] },
                1,
                0,
              ],
            },
          },
          totalEarnings: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$paymentStatus", "Paid"] },
                    {
                      $in: [
                        "$status",
                        [
                          BOOKING_STATUS.COMPLETED,
                          BOOKING_STATUS.CLOSED,
                        ],
                      ],
                    },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
          pendingEarnings: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$paymentStatus", "Paid"] },
                    {
                      $in: [
                        "$status",
                        [
                          BOOKING_STATUS.COMPLETED,
                          BOOKING_STATUS.CLOSED,
                        ],
                      ],
                    },
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

    return (
      stats || {
        totalJobs: 0,
        assignedJobs: 0,
        acceptedJobs: 0,
        inProgressJobs: 0,
        pausedJobs: 0,
        completedJobs: 0,
        closedJobs: 0,
        rejectedJobs: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
      }
    );
  }

  async getPerformance(technicianId, startDate, endDate) {
    const techId = this.toObjectId(technicianId);

    const [result] = await Booking.aggregate([
      {
        $match: {
          technician: techId,
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          completedJobs: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CLOSED],
                  ],
                },
                1,
                0,
              ],
            },
          },
          activeJobs: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [
                      BOOKING_STATUS.ACCEPTED,
                      BOOKING_STATUS.IN_PROGRESS,
                      BOOKING_STATUS.PAUSED,
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },
          earnings: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$paymentStatus", "Paid"] },
                    {
                      $in: [
                        "$status",
                        [
                          BOOKING_STATUS.COMPLETED,
                          BOOKING_STATUS.CLOSED,
                        ],
                      ],
                    },
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

    const completedByDay = await Booking.aggregate([
      {
        $match: {
          technician: techId,
          status: {
            $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CLOSED],
          },
          completedAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$completedAt",
            },
          },
          count: { $sum: 1 },
          earnings: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "Paid"] },
                "$amount",
                0,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      summary: result || {
        totalJobs: 0,
        completedJobs: 0,
        activeJobs: 0,
        earnings: 0,
      },
      dailyBreakdown: completedByDay.map((day) => ({
        date: day._id,
        completedJobs: day.count,
        earnings: day.earnings,
      })),
    };
  }

  async getRecentJobs(technicianId, statusList, limit = 5) {
    const filter = { technician: technicianId };

    if (statusList?.length) {
      filter.status = { $in: statusList };
    }

    return await Booking.find(filter)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate("customer", "name email phone city")
      .select(
        "serviceCategory serviceName status bookingDate bookingTime amount paymentStatus startedAt completedAt createdAt updatedAt"
      );
  }

  async getUpcomingJobs(technicianId, limit = 5) {
    return await Booking.find({
      technician: technicianId,
      bookingDate: { $gte: new Date() },
      status: {
        $in: [
          BOOKING_STATUS.ASSIGNED,
          BOOKING_STATUS.ACCEPTED,
          BOOKING_STATUS.IN_PROGRESS,
          BOOKING_STATUS.PAUSED,
        ],
      },
    })
      .sort({ bookingDate: 1 })
      .limit(limit)
      .populate("customer", "name email phone city")
      .select(
        "serviceCategory serviceName status bookingDate bookingTime amount createdAt"
      );
  }

  async getCategoryBreakdown(technicianId) {
    const techId = this.toObjectId(technicianId);

    return await Booking.aggregate([
      {
        $match: {
          technician: techId,
          status: {
            $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CLOSED],
          },
        },
      },
      {
        $group: {
          _id: "$serviceCategory",
          count: { $sum: 1 },
          earnings: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "Paid"] },
                "$amount",
                0,
              ],
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }
}

export default new TechnicianDashboardRepository();
