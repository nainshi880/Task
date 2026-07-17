import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import TechnicianProfile from "../models/TechnicianProfile.js";
import mongoose from "mongoose";
import { REVIEW_STATUS, REPORT_STATUS } from "../constants/review.js";

class ReviewRepository {
  async create(data) {
    return await Review.create(data);
  }

  async findById(reviewId) {
    return await Review.findById(reviewId)
      .populate("customer", "name email avatar")
      .populate("technician", "name email avatar rating")
      .populate("booking", "serviceName serviceCategory status bookingDate")
      .populate("moderatedBy", "name email")
      .populate("deletedBy", "name email")
      .populate("reports.reportedBy", "name email role");
  }

  async findByBooking(bookingId) {
    return await Review.findOne({ booking: bookingId, isDeleted: false });
  }

  async findActiveById(reviewId) {
    return await Review.findOne({ _id: reviewId, isDeleted: false });
  }

  async listByTechnician(
    technicianId,
    { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = {}
  ) {
    const filter = {
      technician: technicianId,
      status: REVIEW_STATUS.APPROVED,
      isDeleted: false,
    };

    const allowedSort = ["createdAt", "rating"];
    const sortField = allowedSort.includes(sortBy) ? sortBy : "createdAt";
    const sortDir = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Review.find(filter)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .select("rating title comment createdAt customer booking technician")
        .populate("customer", "name avatar")
        .populate("booking", "serviceName serviceCategory bookingDate")
        .lean(),
      Review.countDocuments(filter),
    ]);

    return { items, total };
  }

  async listByServiceName(
    serviceName,
    {
      category,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = {}
  ) {
    const bookingMatch = {
      serviceName: { $regex: `^${serviceName.trim()}$`, $options: "i" },
    };
    if (category) bookingMatch.serviceCategory = category;

    const bookingIds = await Booking.find(bookingMatch).distinct("_id");

    const filter = {
      booking: { $in: bookingIds },
      status: REVIEW_STATUS.APPROVED,
      isDeleted: false,
    };

    const allowedSort = ["createdAt", "rating"];
    const sortField = allowedSort.includes(sortBy) ? sortBy : "createdAt";
    const sortDir = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const [items, total, stats] = await Promise.all([
      Review.find(filter)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .select("rating title comment createdAt customer booking technician")
        .populate("customer", "name avatar")
        .populate("technician", "name avatar rating")
        .populate("booking", "serviceName serviceCategory bookingDate")
        .lean(),
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      items,
      total,
      averageRating: stats[0]?.averageRating
        ? Number(stats[0].averageRating.toFixed(1))
        : 0,
      totalReviews: stats[0]?.totalReviews || 0,
    };
  }

  async getRatingDistribution(technicianId) {
    const rows = await Review.aggregate([
      {
        $match: {
          technician: new mongoose.Types.ObjectId(String(technicianId)),
          status: REVIEW_STATUS.APPROVED,
          isDeleted: false,
        },
      },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of rows) {
      distribution[row._id] = row.count;
    }

    return distribution;
  }

  async customerSoftDelete(reviewId, customerId) {
    return await this.update(reviewId, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: customerId,
      status: REVIEW_STATUS.HIDDEN,
    });
  }

  async list({
    page = 1,
    limit = 10,
    status,
    technicianId,
    customerId,
    rating,
    minRating,
    maxRating,
    reportedOnly = false,
    includeDeleted = false,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = {}) {
    const filter = {};

    if (!includeDeleted) filter.isDeleted = false;
    if (status) filter.status = status;
    if (technicianId) filter.technician = technicianId;
    if (customerId) filter.customer = customerId;

    if (rating) filter.rating = Number(rating);
    if (minRating || maxRating) {
      filter.rating = {};
      if (minRating) filter.rating.$gte = Number(minRating);
      if (maxRating) filter.rating.$lte = Number(maxRating);
    }

    if (reportedOnly) {
      filter.reportCount = { $gt: 0 };
    }

    const allowedSort = ["createdAt", "rating", "reportCount", "updatedAt"];
    const sortField = allowedSort.includes(sortBy) ? sortBy : "createdAt";
    const sortDir = sortOrder === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Review.find(filter)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .select(
          "rating title comment status reportCount createdAt customer technician booking"
        )
        .populate("customer", "name email avatar")
        .populate("technician", "name email avatar rating")
        .populate("booking", "serviceName serviceCategory status")
        .lean(),
      Review.countDocuments(filter),
    ]);

    return { items, total };
  }

  async update(reviewId, update) {
    return await Review.findByIdAndUpdate(reviewId, update, {
      new: true,
      runValidators: true,
    })
      .populate("customer", "name email avatar")
      .populate("technician", "name email avatar rating")
      .populate("booking", "serviceName serviceCategory status")
      .populate("moderatedBy", "name email");
  }

  async softDelete(reviewId, adminId) {
    return await this.update(reviewId, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: adminId,
      status: REVIEW_STATUS.HIDDEN,
    });
  }

  async addReport(reviewId, { reportedBy, reason }) {
    const review = await Review.findById(reviewId);
    if (!review || review.isDeleted) return null;

    review.reports.push({
      reportedBy,
      reason,
      status: REPORT_STATUS.OPEN,
    });
    review.reportCount = review.reports.filter(
      (r) => r.status === REPORT_STATUS.OPEN
    ).length;

    await review.save();
    return await this.findById(reviewId);
  }

  async resolveReport(reviewId, reportId, adminId, status) {
    const review = await Review.findById(reviewId);
    if (!review) return null;

    const report = review.reports.id(reportId);
    if (!report) return null;

    report.status = status;
    report.resolvedBy = adminId;
    report.resolvedAt = new Date();

    review.reportCount = review.reports.filter(
      (r) => r.status === REPORT_STATUS.OPEN
    ).length;

    await review.save();
    return await this.findById(reviewId);
  }

  async getTechnicianRatingStats(technicianId) {
    const [stats] = await Review.aggregate([
      {
        $match: {
          technician: technicianId,
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
        : 5,
      totalReviews: stats?.totalReviews || 0,
    };
  }

  async recalculateTechnicianRating(technicianId) {
    const stats = await this.getTechnicianRatingStats(technicianId);

    await Promise.all([
      User.findByIdAndUpdate(technicianId, {
        rating: stats.averageRating,
      }),
      TechnicianProfile.findOneAndUpdate(
        { user: technicianId },
        { rating: stats.averageRating }
      ),
    ]);

    return stats;
  }

  async getAnalytics({ fromDate, toDate, technicianId } = {}) {
    const match = { isDeleted: false };

    if (technicianId) {
      match.technician = new mongoose.Types.ObjectId(technicianId);
    }

    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        match.createdAt.$lte = end;
      }
    }

    const [
      overview,
      byStatus,
      byRating,
      topTechnicians,
      pendingCount,
      reportedCount,
    ] = await Promise.all([
      Review.aggregate([
        {
          $match: {
            ...match,
            status: REVIEW_STATUS.APPROVED,
          },
        },
        {
          $group: {
            _id: null,
            totalApproved: { $sum: 1 },
            averageRating: { $avg: "$rating" },
          },
        },
      ]),
      Review.aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Review.aggregate([
        {
          $match: {
            ...match,
            status: REVIEW_STATUS.APPROVED,
          },
        },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Review.aggregate([
        {
          $match: {
            ...match,
            status: REVIEW_STATUS.APPROVED,
          },
        },
        {
          $group: {
            _id: "$technician",
            averageRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 },
          },
        },
        { $match: { reviewCount: { $gte: 1 } } },
        { $sort: { averageRating: -1, reviewCount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "technician",
          },
        },
        { $unwind: "$technician" },
        {
          $project: {
            technicianId: "$_id",
            name: "$technician.name",
            email: "$technician.email",
            averageRating: { $round: ["$averageRating", 2] },
            reviewCount: 1,
          },
        },
      ]),
      Review.countDocuments({
        ...match,
        status: REVIEW_STATUS.PENDING,
      }),
      Review.countDocuments({
        ...match,
        reportCount: { $gt: 0 },
      }),
    ]);

    const summary = overview[0] || {
      totalApproved: 0,
      averageRating: 0,
    };

    return {
      summary: {
        totalApproved: summary.totalApproved,
        averageRating: Number((summary.averageRating || 0).toFixed(2)),
        pendingModeration: pendingCount,
        reportedReviews: reportedCount,
      },
      byStatus: byStatus.map((row) => ({
        status: row._id,
        count: row.count,
      })),
      byRating: byRating.map((row) => ({
        rating: row._id,
        count: row.count,
      })),
      topTechnicians,
    };
  }
}

export default new ReviewRepository();
