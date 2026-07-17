 import CustomerProfile from "../models/CustomerProfile.js";
 import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";


class CustomerRepository {

  // Create Customer Profile
  
  async createProfile(profileData) {
    return await CustomerProfile.create(profileData);
  }

  // Get Profile by User ID
 
  async findProfileByUserId(userId) {
    return await CustomerProfile.findOne({
      user: userId,
      isDeleted: false,
    }).populate(
      "user",
      "email role isVerified isActive lastLogin"
    );
  }

  // Get Profile by Profile ID
 
  async findProfileById(profileId) {
    return await CustomerProfile.findOne({
      _id: profileId,
      isDeleted: false,
    });
  }

  // Update Profile
  
  async updateProfile(userId, updateData) {
    return await CustomerProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );
  }

  // Soft Delete Profile
  
  async softDeleteProfile(userId) {
    return await CustomerProfile.findOneAndUpdate(
      {
        user: userId,
      },
      {
        isDeleted: true,
      },
      {
        new: true,
      }
    );
  }

  // Update Avatar
  
  async updateAvatar(userId, avatarUrl) {
    return await CustomerProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      {
        avatar: avatarUrl,
      },
      {
        new: true,
      }
    );
  }

  
  // Delete Avatar
  
  async deleteAvatar(userId) {
    return await CustomerProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      {
        avatar: null,
      },
      {
        new: true,
      }
    );
  }

  // Update Addresses

  async updateAddresses(userId, addresses) {
    return await CustomerProfile.findOneAndUpdate(
      {
        user: userId,
        isDeleted: false,
      },
      {
        addresses,
      },
      {
        new: true,
        runValidators: true,
      }
    );
  }
  
  // Check if Profile Exists
  async profileExists(userId) {
  return await CustomerProfile.exists({
    user: userId,
    isDeleted: false,
  });
}
 // Add Address
 async addAddress(userId, address) {

    return await CustomerProfile.findOneAndUpdate(

        {
            user: userId,
            isDeleted: false
        },

        {
            $push:{
                addresses:address
            }
        },

        {
            new:true,
            runValidators:true
        }

    );

}
 
// Get Address
async getAddresses(userId){

return await CustomerProfile.findOne(

{
user:userId,
isDeleted:false
},

{
addresses:1
}

);

}

// Update Address
async updateAddress(userId,addressId,address){

return await CustomerProfile.findOneAndUpdate(

{
user:userId,
"addresses._id":addressId
},

{
$set:{

"addresses.$":{

...address,

_id:addressId

}

}

},

{
new:true
}

);

}
// Delete Address

async deleteAddress(userId,addressId){

return await CustomerProfile.findOneAndUpdate(

{
user:userId
},

{
$pull:{

addresses:{

_id:addressId

}

}

},

{
new:true
}

);
}

 // =====================================================
  // Dashboard Methods 
  // =====================================================

  async getDashboardProfile(userId) {
    return await CustomerProfile.findOne({
      user: userId,
      isDeleted: false,
    }).populate(
      "user",
      "name email isVerified"
    );
  }

  async getBookingStatistics(userId) {

    const statistics = await Booking.aggregate([
      {
        $match: {
          customer: userId,
        },
      },
      {
        $group: {
          _id: null,

          totalBookings: {
            $sum: 1,
          },

          pendingBookings: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Pending"] },
                1,
                0,
              ],
            },
          },

          assignedBookings: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Assigned"] },
                1,
                0,
              ],
            },
          },

          acceptedBookings: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Accepted"] },
                1,
                0,
              ],
            },
          },

          inProgressBookings: {
            $sum: {
              $cond: [
                { $eq: ["$status", "In Progress"] },
                1,
                0,
              ],
            },
          },

          completedBookings: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Completed"] },
                1,
                0,
              ],
            },
          },

          cancelledBookings: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Cancelled"] },
                1,
                0,
              ],
            },
          },

          totalSpent: {
            $sum: "$amount",
          },
        },
      },
    ]);

    return statistics[0] || null;
  }

  async getRecentBookings(userId) {
    return await Booking.find({
      customer: userId,
    })
      .sort({
        createdAt: -1,
      })
      .limit(5)
      .populate(
        "technician",
        "name email"
      );
  }

  async getUpcomingBookings(userId) {
    return await Booking.find({
      customer: userId,
      bookingDate: {
        $gte: new Date(),
      },
      status: {
        $nin: [
          "Completed",
          "Cancelled",
          "Closed",
        ],
      },
    })
      .sort({
        bookingDate: 1,
      })
      .limit(5)
      .populate(
        "technician",
        "name email"
      );
  }

  async getUnreadNotifications(userId) {
    return await Notification.countDocuments({
      user: userId,
      isRead: false,
      isDeleted: false,
    });
  }

  async getRecentNotifications(userId) {
    return await Notification.find({
      user: userId,
      isDeleted: false,
    })
      .sort({
        createdAt: -1,
      })
      .limit(10);
  }

  async getFavoriteService(userId) {

    const category = await Booking.aggregate([
      {
        $match: {
          customer: userId,
          status: "Completed",
        },
      },
      {
        $group: {
          _id: "$serviceCategory",
          total: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          total: -1,
        },
      },
      {
        $limit: 1,
      },
    ]);

    return category[0] || null;
  }

  async getTotalRevenueSpent(userId) {

    const result = await Booking.aggregate([
      {
        $match: {
          customer: userId,
          paymentStatus: "Paid",
        },
      },
      {
        $group: {
          _id: null,
          amount: {
            $sum: "$amount",
          },
        },
      },
    ]);

    return result[0]?.amount || 0;
  }

  // ===========================================
// Get User By ID With Password
// ===========================================

async getUserWithPassword(userId) {

    return await User.findById(userId)
        .select("+password");

}

  // ===========================================
// Update Password
// ===========================================

async updatePassword(userId, hashedPassword) {

    return await User.findByIdAndUpdate(

        userId,

        {

            password: hashedPassword,

            lastPasswordChangedAt: new Date(),

        },

        {

            new: true,

        }

    );

}

// ===========================================
// Deactivate Account
// ===========================================

async deactivateAccount(userId) {

    return await User.findByIdAndUpdate(

        userId,

        {

            isActive: false,

            deactivatedAt: new Date(),

        },

        {

            new: true,

        }

    );

}

// ===========================================
// Delete Account
// ===========================================

async deleteAccount(userId) {

    await User.findByIdAndUpdate(

        userId,

        {

            isDeleted: true,

            deletedAt: new Date(),

            isActive: false,

        }

    );

    await CustomerProfile.findOneAndUpdate(

        {

            user: userId,

        },

        {

            isDeleted: true,

        }

    );

    return true;

}

// ===========================================
// Logout All Devices
// ===========================================

async logoutAllDevices(userId) {

    return await User.findByIdAndUpdate(

        userId,

        {

            $inc: {

                tokenVersion: 1,

            },

        },

        {

            new: true,

        }

    );

}

// ===========================================
// Update Notification Preferences
// ===========================================

async updatePreferences(

    userId,

    preferences

) {

    const setFields = {};

    for (const [key, value] of Object.entries(preferences || {})) {
      if (value !== undefined) {
        setFields[`preferences.${key}`] = value;
      }
    }

    setFields.lastProfileUpdated = new Date();

    return await CustomerProfile.findOneAndUpdate(

        {

            user: userId,

            isDeleted: false,

        },

        {

            $set: setFields,

        },

        {

            new: true,

            runValidators: true,

        }

    );

}


// ===========================================
// Update Privacy Settings
// ===========================================

async updatePrivacy(

    userId,

    privacy

) {

    return await CustomerProfile.findOneAndUpdate(

        {

            user: userId,

            isDeleted: false,

        },

        {

            privacy,

            lastProfileUpdated: new Date(),

        },

        {

            new: true,

            runValidators: true,

        }

    );

}

// ===========================================
// Get Preferences
// ===========================================

async getPreferences(userId) {

    return await CustomerProfile.findOne(

        {

            user: userId,

            isDeleted: false,

        },

        {

            preferences: 1,

        }

    );

}

// ===========================================
// Get Privacy Settings
// ===========================================

async getPrivacy(userId) {

    return await CustomerProfile.findOne(

        {

            user: userId,

            isDeleted: false,

        },

        {

            privacy: 1,

        }

    );

}

  // =====================================================
  // Search / Filter / Pagination / Sorting
  // =====================================================

  buildCustomerMatch({
    city,
    gender,
    profileCompleted,
    includeDeleted = false,
  } = {}) {
    const match = {};

    if (includeDeleted === true || includeDeleted === "true") {
      // include both deleted and active — no isDeleted filter
    } else if (includeDeleted === "only") {
      match.isDeleted = true;
    } else {
      match.isDeleted = false;
    }

    if (gender) {
      match.gender = gender;
    }

    if (
      profileCompleted !== undefined &&
      profileCompleted !== null &&
      profileCompleted !== ""
    ) {
      match.profileCompleted =
        profileCompleted === true ||
        profileCompleted === "true";
    }

    if (city) {
      match["addresses.city"] = new RegExp(
        `^${city.trim()}$`,
        "i"
      );
    }

    return match;
  }

  async searchCustomers({
    search,
    city,
    gender,
    profileCompleted,
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

    const sortField = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

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
    ];

    if (search && search.trim()) {
      const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      pipeline.push({
        $match: {
          $or: [
            { fullName: { $regex: term, $options: "i" } },
            { phone: { $regex: term, $options: "i" } },
            { "user.email": { $regex: term, $options: "i" } },
            { "user.name": { $regex: term, $options: "i" } },
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
                role: "$user.role",
                isActive: "$user.isActive",
                isVerified: "$user.isVerified",
                city: "$user.city",
              },
            },
          },
        ],
        meta: [{ $count: "total" }],
      },
    });

    const [result] = await CustomerProfile.aggregate(pipeline);
    const customers = result?.data || [];
    const total = result?.meta?.[0]?.total || 0;

    return { customers, total };
  }

}

export default new CustomerRepository();