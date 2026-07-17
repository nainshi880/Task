import User from "../models/User.js";
import Booking from "../models/Booking.js";
import TechnicianProfile from "../models/TechnicianProfile.js";
import ROLES from "../constants/roles.js";
import { ACTIVE_WORKLOAD_STATUSES } from "../constants/assignment.js";
import TECHNICIAN_APPLICATION_STATUS from "../constants/technicianApplication.js";

class TechnicianRepository {
  async getApprovedTechnicianIds() {
    return await TechnicianProfile.find({
      isDeleted: false,
      isSuspended: { $ne: true },
      $or: [
        { applicationStatus: TECHNICIAN_APPLICATION_STATUS.APPROVED },
        { applicationStatus: { $exists: false } },
      ],
    }).distinct("user");
  }

  async findById(technicianId) {
    return await User.findOne({
      _id: technicianId,
      role: ROLES.TECHNICIAN,
      isDeleted: false,
    }).select(
      "name email phone city role availability rating skills maxWorkload isActive isVerified avatar"
    );
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
