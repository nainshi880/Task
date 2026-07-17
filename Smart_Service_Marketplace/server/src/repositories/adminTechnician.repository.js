import User from "../models/User.js";
import TechnicianProfile from "../models/TechnicianProfile.js";
import AssignmentHistory from "../models/AssignmentHistory.js";
import ROLES from "../constants/roles.js";
import TECHNICIAN_APPLICATION_STATUS from "../constants/technicianApplication.js";

class AdminTechnicianRepository {
  async findTechnicianUser(technicianId) {
    return await User.findOne({
      _id: technicianId,
      role: ROLES.TECHNICIAN,
      isDeleted: false,
    });
  }

  async findProfileByUserId(userId) {
    return await TechnicianProfile.findOne({ user: userId, isDeleted: false })
      .populate("user", "name email phone city role isActive isVerified rating skills availability lastLogin createdAt")
      .populate("reviewedBy", "name email")
      .populate("verifiedBy", "name email")
      .populate("suspendedBy", "name email");
  }

  async listTechnicians({
    search,
    applicationStatus,
    isSuspended,
    workingCity,
    skill,
    includeDeleted = false,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = {}) {
    const match = {};

    if (includeDeleted === true || includeDeleted === "true") {
      // all
    } else if (includeDeleted === "only") {
      match.isDeleted = true;
    } else {
      match.isDeleted = false;
    }

    if (applicationStatus) match.applicationStatus = applicationStatus;

    if (isSuspended !== undefined && isSuspended !== null && isSuspended !== "") {
      match.isSuspended = isSuspended === true || isSuspended === "true";
    }

    if (workingCity) {
      match.workingCity = new RegExp(`^${workingCity.trim()}$`, "i");
    }

    if (skill) {
      match.$or = [{ skills: skill }, { serviceCategories: skill }];
    }

    const allowedSort = [
      "createdAt",
      "updatedAt",
      "fullName",
      "rating",
      "totalJobsCompleted",
      "applicationStatus",
    ];
    const sortField = allowedSort.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const pipeline = [{ $match: match }];

    if (search?.trim()) {
      const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      pipeline.push({
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDoc",
        },
      });
      pipeline.push({ $unwind: "$userDoc" });
      pipeline.push({
        $match: {
          $or: [
            { fullName: { $regex: term, $options: "i" } },
            { phone: { $regex: term, $options: "i" } },
            { workingCity: { $regex: term, $options: "i" } },
            { "userDoc.email": { $regex: term, $options: "i" } },
            { "userDoc.name": { $regex: term, $options: "i" } },
          ],
        },
      });
    } else {
      pipeline.push({
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDoc",
        },
      });
      pipeline.push({ $unwind: "$userDoc" });
      pipeline.push({
        $match: {
          "userDoc.role": ROLES.TECHNICIAN,
          "userDoc.isDeleted": false,
        },
      });
    }

    pipeline.push({
      $facet: {
        data: [
          { $sort: { [sortField]: sortDirection } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              fullName: 1,
              phone: 1,
              workingCity: 1,
              skills: 1,
              serviceCategories: 1,
              rating: 1,
              totalJobsCompleted: 1,
              applicationStatus: 1,
              isSuspended: 1,
              availabilityStatus: 1,
              onlineStatus: 1,
              vacationMode: 1,
              profileCompleted: 1,
              verifiedAt: 1,
              reviewedAt: 1,
              createdAt: 1,
              user: {
                _id: "$userDoc._id",
                name: "$userDoc.name",
                email: "$userDoc.email",
                phone: "$userDoc.phone",
                isActive: "$userDoc.isActive",
                isVerified: "$userDoc.isVerified",
                rating: "$userDoc.rating",
                availability: "$userDoc.availability",
              },
            },
          },
        ],
        meta: [{ $count: "total" }],
      },
    });

    const [result] = await TechnicianProfile.aggregate(pipeline);

    return {
      technicians: result?.data || [],
      total: result?.meta?.[0]?.total || 0,
    };
  }

  async updateProfile(userId, update) {
    return await TechnicianProfile.findOneAndUpdate(
      { user: userId, isDeleted: false },
      update,
      { new: true, runValidators: true }
    )
      .populate("user", "name email phone city role isActive isVerified rating skills availability")
      .populate("reviewedBy", "name email")
      .populate("verifiedBy", "name email")
      .populate("suspendedBy", "name email");
  }

  async updateUser(userId, update) {
    return await User.findByIdAndUpdate(userId, update, {
      new: true,
      runValidators: true,
    });
  }

  async getRatingSummary(technicianId) {
    const [profile, user, assignmentStats] = await Promise.all([
      TechnicianProfile.findOne({ user: technicianId }).select(
        "rating totalJobsCompleted"
      ),
      User.findById(technicianId).select("rating"),
      AssignmentHistory.aggregate([
        { $match: { technician: technicianId } },
        {
          $group: {
            _id: null,
            totalAssignments: { $sum: 1 },
            avgMatchRating: { $avg: "$matchDetails.rating" },
          },
        },
      ]),
    ]);

    const stats = assignmentStats[0] || {
      totalAssignments: 0,
      avgMatchRating: 0,
    };

    return {
      profileRating: profile?.rating ?? 5,
      userRating: user?.rating ?? 5,
      totalJobsCompleted: profile?.totalJobsCompleted ?? 0,
      totalAssignments: stats.totalAssignments,
      averageMatchScore: Number((stats.avgMatchRating || 0).toFixed(2)),
    };
  }

  async countPendingApplications() {
    return await TechnicianProfile.countDocuments({
      applicationStatus: TECHNICIAN_APPLICATION_STATUS.PENDING,
      isDeleted: false,
    });
  }
}

export default new AdminTechnicianRepository();
