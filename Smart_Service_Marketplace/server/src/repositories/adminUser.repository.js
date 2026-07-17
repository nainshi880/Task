import User from "../models/User.js";
import CustomerProfile from "../models/CustomerProfile.js";
import TechnicianProfile from "../models/TechnicianProfile.js";
import Booking from "../models/Booking.js";
import Wallet from "../models/Wallet.js";
import ROLES from "../constants/roles.js";

class AdminUserRepository {
  buildCustomerMatch({
    city,
    gender,
    profileCompleted,
    includeDeleted = false,
  } = {}) {
    const match = {};

    if (includeDeleted === true || includeDeleted === "true") {
      // include all
    } else if (includeDeleted === "only") {
      match.isDeleted = true;
    } else {
      match.isDeleted = false;
    }

    if (gender) match.gender = gender;

    if (
      profileCompleted !== undefined &&
      profileCompleted !== null &&
      profileCompleted !== ""
    ) {
      match.profileCompleted =
        profileCompleted === true || profileCompleted === "true";
    }

    if (city) {
      match["addresses.city"] = new RegExp(`^${city.trim()}$`, "i");
    }

    return match;
  }

  async findCustomers({
    search,
    city,
    gender,
    profileCompleted,
    isActive,
    isVerified,
    includeDeleted = false,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = {}) {
    const match = this.buildCustomerMatch({
      city,
      gender,
      profileCompleted,
      includeDeleted,
    });

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "fullName",
      "lastProfileUpdated",
      "profileCompleted",
    ];

    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $match: {
          "user.role": ROLES.CUSTOMER,
        },
      },
    ];

    if (isActive !== undefined && isActive !== null && isActive !== "") {
      pipeline.push({
        $match: {
          "user.isActive":
            isActive === true || isActive === "true",
        },
      });
    }

    if (isVerified !== undefined && isVerified !== null && isVerified !== "") {
      pipeline.push({
        $match: {
          "user.isVerified":
            isVerified === true || isVerified === "true",
        },
      });
    }

    if (search && search.trim()) {
      const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      pipeline.push({
        $match: {
          $or: [
            { fullName: { $regex: term, $options: "i" } },
            { phone: { $regex: term, $options: "i" } },
            { "user.email": { $regex: term, $options: "i" } },
            { "user.name": { $regex: term, $options: "i" } },
            { "user.phone": { $regex: term, $options: "i" } },
          ],
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
              gender: 1,
              dateOfBirth: 1,
              avatar: 1,
              addresses: 1,
              profileCompleted: 1,
              isDeleted: 1,
              lastProfileUpdated: 1,
              createdAt: 1,
              updatedAt: 1,
              user: {
                _id: "$user._id",
                name: "$user.name",
                email: "$user.email",
                phone: "$user.phone",
                role: "$user.role",
                isActive: "$user.isActive",
                isVerified: "$user.isVerified",
                isDeleted: "$user.isDeleted",
                city: "$user.city",
                lastLogin: "$user.lastLogin",
                deactivatedAt: "$user.deactivatedAt",
                createdAt: "$user.createdAt",
              },
            },
          },
        ],
        meta: [{ $count: "total" }],
      },
    });

    const [result] = await CustomerProfile.aggregate(pipeline);
    return {
      customers: result?.data || [],
      total: result?.meta?.[0]?.total || 0,
    };
  }

  async findUserById(userId) {
    return await User.findById(userId);
  }

  async getUserDetails(userId) {
    const user = await User.findById(userId).select(
      "-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires"
    );

    if (!user) return null;

    const [profile, technicianProfile, bookingStats, wallet] = await Promise.all([
      CustomerProfile.findOne({ user: userId }),
      TechnicianProfile.findOne({ user: userId }),
      Booking.aggregate([
        { $match: { customer: user._id } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Wallet.findOne({ user: userId }).select("balance currency"),
    ]);

    const bookings = {
      total: bookingStats.reduce((sum, row) => sum + row.count, 0),
      byStatus: Object.fromEntries(
        bookingStats.map((row) => [row._id, row.count])
      ),
    };

    return {
      user,
      profile,
      technicianProfile,
      bookings,
      wallet: wallet
        ? { balance: wallet.balance, currency: wallet.currency }
        : null,
    };
  }

  async blockUser(userId) {
    return await User.findByIdAndUpdate(
      userId,
      {
        isActive: false,
        deactivatedAt: new Date(),
        $inc: { tokenVersion: 1 },
      },
      { new: true }
    );
  }

  async unblockUser(userId) {
    return await User.findByIdAndUpdate(
      userId,
      {
        isActive: true,
        deactivatedAt: null,
      },
      { new: true }
    );
  }

  async deleteUser(userId) {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
        deactivatedAt: new Date(),
        $inc: { tokenVersion: 1 },
      },
      { new: true }
    );

    await Promise.all([
      CustomerProfile.findOneAndUpdate(
        { user: userId },
        { isDeleted: true },
        { new: true }
      ),
      TechnicianProfile.findOneAndUpdate(
        { user: userId },
        { isDeleted: true },
        { new: true }
      ),
    ]);

    return user;
  }

  async getLoginHistory(userId, limit = 20) {
    const user = await User.findById(userId).select("loginHistory");
    return (user?.loginHistory || []).slice(0, limit);
  }
}

export default new AdminUserRepository();
