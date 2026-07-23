import User from "../models/User.js";
import Booking from "../models/Booking.js";
import TechnicianProfile from "../models/TechnicianProfile.js";
import ROLES from "../constants/roles.js";
import { ACTIVE_WORKLOAD_STATUSES } from "../constants/assignment.js";
import TECHNICIAN_APPLICATION_STATUS from "../constants/technicianApplication.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

class TechnicianRepository {
  async getApprovedTechnicianIds() {
    return await TechnicianProfile.find({
      isDeleted: false,
      isSuspended: { $ne: true },
      $or: [
        { applicationStatus: TECHNICIAN_APPLICATION_STATUS.APPROVED },
        { applicationStatus: { $exists: false } },
        // Completed setup but still pending admin review — allow booking.
        {
          applicationStatus: TECHNICIAN_APPLICATION_STATUS.PENDING,
          profileCompleted: true,
        },
      ],
    }).distinct("user");
  }

  async findById(technicianId) {
    return await User.findOne({
      _id: technicianId,
      role: ROLES.TECHNICIAN,
      isDeleted: false,
    }).select(
      "name email phone city role availability rating skills maxWorkload isActive isVerified avatar deviceToken deviceTokens"
    );
  }

  /**
   * Ensures technician account is active, available, and approved for jobs.
   */
  async ensureTechnicianReady(technicianId) {
    const technician = await this.findById(technicianId);

    if (!technician) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Technician not found.");
    }

    if (technician.isActive === false) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Technician account is inactive."
      );
    }

    if (technician.availability === false) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Technician is currently unavailable."
      );
    }

    const approvedIds = await this.getApprovedTechnicianIds();
    const isApproved = approvedIds.some(
      (id) => String(id) === String(technicianId)
    );

    if (!isApproved) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Technician profile is not approved for jobs yet."
      );
    }

    return technician;
  }

  async hasActiveJob(technicianId) {
    const count = await this.getWorkload(technicianId);
    return count > 0;
  }

  /**
   * IDs of technicians who currently have a blocking active booking.
   */
  async findBusyTechnicianIds(technicianIds = []) {
    if (!technicianIds.length) return new Set();

    const results = await Booking.aggregate([
      {
        $match: {
          technician: { $in: technicianIds },
          status: { $in: ACTIVE_WORKLOAD_STATUSES },
        },
      },
      {
        $group: {
          _id: "$technician",
        },
      },
    ]);

    return new Set(results.map((row) => String(row._id)));
  }

  async findEligibleTechnicians({ city, skill } = {}) {
    const approvedIds = await this.getApprovedTechnicianIds();

    const filter = {
      role: ROLES.TECHNICIAN,
      isDeleted: false,
      isActive: true,
      availability: true,
      _id: { $in: approvedIds },
    };

    if (city) {
      filter.city = new RegExp(`^${city.trim()}$`, "i");
    }

    if (skill) {
      filter.skills = skill;
    }

    return await User.find(filter)
      .select(
        "name email phone city availability rating skills maxWorkload isActive"
      )
      .sort({ rating: -1 });
  }

  async findAvailableTechnicians({
    city,
    skill,
    search,
    page = 1,
    limit = 10,
    sortBy = "rating",
    sortOrder = "desc",
  } = {}) {
    const approvedIds = await this.getApprovedTechnicianIds();

    const filter = {
      role: ROLES.TECHNICIAN,
      isDeleted: false,
      isActive: true,
      availability: true,
      _id: { $in: approvedIds },
    };

    if (city) {
      filter.city = new RegExp(`^${city.trim()}$`, "i");
    }

    if (skill) {
      filter.skills = skill;
    }

    if (search?.trim()) {
      const term = search.trim();
      filter.$or = [
        { name: { $regex: term, $options: "i" } },
        { city: { $regex: term, $options: "i" } },
        { skills: { $regex: term, $options: "i" } },
      ];
    }

    const allowedSort = ["rating", "name", "city", "createdAt"];
    const sortField = allowedSort.includes(sortBy) ? sortBy : "rating";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const [technicians, total] = await Promise.all([
      User.find(filter)
        .select(
          "name email phone city availability rating skills maxWorkload isActive avatar createdAt"
        )
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return { technicians, total };
  }

  async getWorkload(technicianId) {
    return await Booking.countDocuments({
      technician: technicianId,
      status: { $in: ACTIVE_WORKLOAD_STATUSES },
    });
  }

  async getWorkloads(technicianIds = []) {
    if (!technicianIds.length) return {};

    const results = await Booking.aggregate([
      {
        $match: {
          technician: { $in: technicianIds },
          status: { $in: ACTIVE_WORKLOAD_STATUSES },
        },
      },
      {
        $group: {
          _id: "$technician",
          count: { $sum: 1 },
        },
      },
    ]);

    return results.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {});
  }

  async updateAvailability(technicianId, availability) {
    return await User.findOneAndUpdate(
      {
        _id: technicianId,
        role: ROLES.TECHNICIAN,
        isDeleted: false,
      },
      { availability },
      { new: true }
    ).select(
      "name email phone city availability rating skills maxWorkload"
    );
  }

  async updateSkills(technicianId, skills) {
    return await User.findOneAndUpdate(
      {
        _id: technicianId,
        role: ROLES.TECHNICIAN,
        isDeleted: false,
      },
      { skills },
      { new: true, runValidators: true }
    ).select(
      "name email phone city availability rating skills maxWorkload"
    );
  }
}

export default new TechnicianRepository();
