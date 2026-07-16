import User from "../models/User.js";
import Booking from "../models/Booking.js";
import ROLES from "../constants/roles.js";
import { ACTIVE_WORKLOAD_STATUSES } from "../constants/assignment.js";

class TechnicianRepository {
  async findById(technicianId) {
    return await User.findOne({
      _id: technicianId,
      role: ROLES.TECHNICIAN,
      isDeleted: false,
    }).select(
      "name email phone city role availability rating skills maxWorkload isActive isVerified"
    );
  }

  async findEligibleTechnicians({ city, skill } = {}) {
    const filter = {
      role: ROLES.TECHNICIAN,
      isDeleted: false,
      isActive: true,
      availability: true,
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

  async findAvailableTechnicians({ city, skill } = {}) {
    const filter = {
      role: ROLES.TECHNICIAN,
      isDeleted: false,
      isActive: true,
      availability: true,
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
      .sort({ rating: -1, createdAt: 1 });
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
