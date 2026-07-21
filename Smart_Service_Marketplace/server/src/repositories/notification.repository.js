import Notification from "../models/Notification.js";
import CustomerProfile from "../models/CustomerProfile.js";
import User from "../models/User.js";
import ROLES from "../constants/roles.js";

class NotificationRepository {
  async create(data) {
    return await Notification.create(data);
  }

  async createMany(docs) {
    if (!docs.length) return [];
    return await Notification.insertMany(docs, { ordered: false });
  }

  async findByIdForUser(notificationId, userId) {
    return await Notification.findOne({
      _id: notificationId,
      user: userId,
      isDeleted: false,
    })
      .populate("booking", "serviceName status paymentStatus amount")
      .populate("payment", "amount status method purpose");
  }

  async listForUser(
    userId,
    {
      page = 1,
      limit = 10,
      type,
      isRead,
      includeDeleted = false,
    } = {}
  ) {
    const filter = { user: userId };
    if (!includeDeleted) filter.isDeleted = false;
    if (type) filter.type = type;
    if (isRead !== undefined) {
      filter.isRead =
        isRead === true || isRead === "true";
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("booking", "serviceName status paymentStatus amount")
        .populate("payment", "amount status method purpose"),
      Notification.countDocuments(filter),
    ]);

    return { items, total };
  }

  async countUnread(userId) {
    return await Notification.countDocuments({
      user: userId,
      isRead: false,
      isDeleted: false,
    });
  }

  async markRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        user: userId,
        isDeleted: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );
  }

  async markUnread(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        user: userId,
        isDeleted: false,
      },
      {
        isRead: false,
        readAt: null,
      },
      { new: true }
    );
  }

  async markAllRead(userId) {
    const result = await Notification.updateMany(
      {
        user: userId,
        isRead: false,
        isDeleted: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );
    return result.modifiedCount;
  }

  async softDelete(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        user: userId,
        isDeleted: false,
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    );
  }

  async softDeleteMany(userId, { onlyRead = false } = {}) {
    const filter = {
      user: userId,
      isDeleted: false,
    };
    if (onlyRead) filter.isRead = true;

    const result = await Notification.updateMany(filter, {
      isDeleted: true,
      deletedAt: new Date(),
    });
    return result.modifiedCount;
  }

  async getPreferences(userId) {
    const profile = await CustomerProfile.findOne({
      user: userId,
      isDeleted: false,
    }).select("preferences");

    if (profile?.preferences) {
      return profile.preferences;
    }

    // Technicians / users without CustomerProfile — default prefs
    return {
      emailNotification: true,
      pushNotification: true,
      whatsappNotification: true,
      inAppNotification: true,
      bookingNotifications: true,
      paymentNotifications: true,
      systemNotifications: true,
      promotionalNotifications: true,
    };
  }

  async updatePreferences(userId, preferences) {
    const setFields = {};
    for (const [key, value] of Object.entries(preferences)) {
      if (value !== undefined) {
        setFields[`preferences.${key}`] = value;
      }
    }

    if (!Object.keys(setFields).length) {
      return await this.getPreferences(userId);
    }

    setFields.lastProfileUpdated = new Date();

    let profile = await CustomerProfile.findOneAndUpdate(
      { user: userId, isDeleted: false },
      { $set: setFields },
      { new: true, runValidators: true }
    );

    // If no customer profile, create a minimal one for preference storage
    if (!profile) {
      const user = await User.findById(userId).select("name role");
      if (!user) return null;

      profile = await CustomerProfile.findOneAndUpdate(
        { user: userId },
        {
          $setOnInsert: {
            user: userId,
            fullName: user.name || "User",
          },
          $set: setFields,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    return profile?.preferences || null;
  }

  async findCustomerUserIds({ city } = {}) {
    const filter = {
      role: ROLES.CUSTOMER,
      isDeleted: false,
      isActive: true,
    };
    if (city) filter.city = new RegExp(`^${city}$`, "i");

    const users = await User.find(filter).select("_id");
    return users.map((u) => u._id);
  }
}

export default new NotificationRepository();
