import mongoose from "mongoose";
import Payout, { PAYOUT_STATUS } from "../models/Payout.js";
import Booking from "../models/Booking.js";
import BOOKING_STATUS from "../constants/bookingStatus.js";

class EarningsRepository {
  toObjectId(id) {
    return new mongoose.Types.ObjectId(id);
  }

  async getEarningsSummary(technicianId) {
    const techId = this.toObjectId(technicianId);

    const [bookingStats] = await Booking.aggregate([
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
          _id: null,
          totalJobs: { $sum: 1 },
          grossEarnings: { $sum: "$amount" },
          paidEarnings: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "Paid"] },
                "$amount",
                0,
              ],
            },
          },
          unpaidEarnings: {
            $sum: {
              $cond: [
                { $ne: ["$paymentStatus", "Paid"] },
                "$amount",
                0,
              ],
            },
          },
        },
      },
    ]);

    const [payoutStats] = await Payout.aggregate([
      {
        $match: {
          technician: techId,
        },
      },
      {
        $group: {
          _id: null,
          totalPaidOut: {
            $sum: {
              $cond: [
                { $eq: ["$status", PAYOUT_STATUS.PAID] },
                "$amount",
                0,
              ],
            },
          },
          pendingPayouts: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [PAYOUT_STATUS.PENDING, PAYOUT_STATUS.PROCESSING],
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
          payoutCount: { $sum: 1 },
        },
      },
    ]);

    const bookings = bookingStats || {
      totalJobs: 0,
      grossEarnings: 0,
      paidEarnings: 0,
      unpaidEarnings: 0,
    };

    const payouts = payoutStats || {
      totalPaidOut: 0,
      pendingPayouts: 0,
      payoutCount: 0,
    };

    const availableForPayout = Math.max(
      (bookings.paidEarnings || 0) - (payouts.totalPaidOut || 0) - (payouts.pendingPayouts || 0),
      0
    );

    return {
      totalJobs: bookings.totalJobs,
      grossEarnings: bookings.grossEarnings,
      paidEarnings: bookings.paidEarnings,
      unpaidEarnings: bookings.unpaidEarnings,
      totalPaidOut: payouts.totalPaidOut,
      pendingPayouts: payouts.pendingPayouts,
      availableForPayout: Number(availableForPayout.toFixed(2)),
      payoutCount: payouts.payoutCount,
    };
  }

  async getMonthlyEarnings(technicianId, year, month) {
    const techId = this.toObjectId(technicianId);
    const start = new Date(year, month - 1, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(year, month, 0);
    end.setHours(23, 59, 59, 999);

    const [summary] = await Booking.aggregate([
      {
        $match: {
          technician: techId,
          status: {
            $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CLOSED],
          },
          completedAt: {
            $gte: start,
            $lte: end,
          },
        },
      },
      {
        $group: {
          _id: null,
          jobsCompleted: { $sum: 1 },
          grossEarnings: { $sum: "$amount" },
          paidEarnings: {
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
    ]);

    const daily = await Booking.aggregate([
      {
        $match: {
          technician: techId,
          status: {
            $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CLOSED],
          },
          completedAt: {
            $gte: start,
            $lte: end,
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
          jobs: { $sum: 1 },
          earnings: { $sum: "$amount" },
          paid: {
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

    const byCategory = await Booking.aggregate([
      {
        $match: {
          technician: techId,
          status: {
            $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CLOSED],
          },
          completedAt: {
            $gte: start,
            $lte: end,
          },
        },
      },
      {
        $group: {
          _id: "$serviceCategory",
          jobs: { $sum: 1 },
          earnings: { $sum: "$amount" },
        },
      },
      { $sort: { earnings: -1 } },
    ]);

    return {
      year,
      month,
      period: { from: start, to: end },
      summary: summary || {
        jobsCompleted: 0,
        grossEarnings: 0,
        paidEarnings: 0,
      },
      dailyBreakdown: daily.map((d) => ({
        date: d._id,
        jobs: d.jobs,
        earnings: d.earnings,
        paid: d.paid,
      })),
      byCategory: byCategory.map((c) => ({
        category: c._id,
        jobs: c.jobs,
        earnings: c.earnings,
      })),
    };
  }

  async getPayoutHistory(technicianId, { page = 1, limit = 10, status } = {}) {
    const filter = { technician: technicianId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Payout.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("processedBy", "name email"),
      Payout.countDocuments(filter),
    ]);

    return { items, total };
  }

  async createPayout(payoutData, session = null) {
    if (session) {
      const [doc] = await Payout.create([payoutData], { session });
      return doc;
    }
    return await Payout.create(payoutData);
  }

  async findPayoutById(payoutId, technicianId = null) {
    const filter = { _id: payoutId };
    if (technicianId) filter.technician = technicianId;
    return await Payout.findOne(filter).populate(
      "processedBy",
      "name email"
    );
  }

  async updatePayoutStatus(payoutId, updateData) {
    return await Payout.findByIdAndUpdate(payoutId, updateData, {
      new: true,
      runValidators: true,
    }).populate("processedBy", "name email");
  }

  async getUnpaidCompletedBookings(technicianId, periodStart, periodEnd) {
    const lockedPayouts = await Payout.find({
      technician: technicianId,
      status: {
        $in: [
          PAYOUT_STATUS.PENDING,
          PAYOUT_STATUS.PROCESSING,
          PAYOUT_STATUS.PAID,
        ],
      },
    }).select("bookingIds");

    const lockedBookingIds = lockedPayouts.flatMap(
      (p) => p.bookingIds || []
    );

    const filter = {
      technician: technicianId,
      status: {
        $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CLOSED],
      },
      paymentStatus: "Paid",
      completedAt: {
        $gte: periodStart,
        $lte: periodEnd,
      },
    };

    if (lockedBookingIds.length) {
      filter._id = { $nin: lockedBookingIds };
    }

    return await Booking.find(filter).select(
      "_id amount completedAt serviceCategory"
    );
  }

  async listAllPayouts({ page = 1, limit = 10, status, technicianId } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (technicianId) filter.technician = technicianId;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Payout.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("technician", "name email phone")
        .populate("processedBy", "name email"),
      Payout.countDocuments(filter),
    ]);

    return { items, total };
  }
}

export default new EarningsRepository();
