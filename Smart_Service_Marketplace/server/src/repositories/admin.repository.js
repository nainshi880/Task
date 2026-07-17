import User from "../models/User.js";
import AdminProfile from "../models/AdminProfile.js";
import ROLES, { ADMIN_ROLES } from "../constants/roles.js";

class AdminRepository {
  async findAdminByEmail(email) {
    return await User.findOne({
      email: email.toLowerCase().trim(),
      role: { $in: ADMIN_ROLES },
    }).select("+password");
  }

  async findAdminById(userId) {
    return await User.findOne({
      _id: userId,
      role: { $in: ADMIN_ROLES },
    });
  }

  async findAdminWithPassword(userId) {
    return await User.findOne({
      _id: userId,
      role: { $in: ADMIN_ROLES },
    }).select("+password");
  }

  async findSuperAdmin() {
    return await User.findOne({ role: ROLES.SUPER_ADMIN });
  }

  async findByEmailAnyRole(email) {
    return await User.findOne({
      email: email.toLowerCase().trim(),
    });
  }

  async listAdmins() {
    return await User.find({ role: { $in: ADMIN_ROLES } })
      .select("name email role phone isActive isVerified lastLogin createdAt")
      .sort({ role: -1, createdAt: 1 });
  }

  async createAdminUser(data) {
    return await User.create(data);
  }

  async findProfileByUserId(userId) {
    return await AdminProfile.findOne({ user: userId }).populate(
      "user",
      "name email role isActive isVerified lastLogin createdAt"
    );
  }

  async createProfile(data) {
    return await AdminProfile.create(data);
  }

  async updateProfile(userId, update) {
    return await AdminProfile.findOneAndUpdate({ user: userId }, update, {
      new: true,
      runValidators: true,
    }).populate(
      "user",
      "name email role isActive isVerified lastLogin createdAt"
    );
  }

  async recordLoginAttempt(userId, { success, ip, userAgent }) {
    const update = {
      $push: {
        loginHistory: {
          $each: [{ ip, userAgent, loginTime: new Date() }],
          $position: 0,
          $slice: 20,
        },
      },
    };

    if (success) {
      update.$set = {
        lastLogin: new Date(),
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      };
    } else {
      update.$inc = { failedLoginAttempts: 1 };
    }

    return await User.findByIdAndUpdate(userId, update, { new: true });
  }

  async lockAccount(userId, until) {
    return await User.findByIdAndUpdate(
      userId,
      { accountLockedUntil: until },
      { new: true }
    );
  }

  async updatePassword(userId, hashedPassword) {
    return await User.findByIdAndUpdate(
      userId,
      {
        password: hashedPassword,
        lastPasswordChangedAt: new Date(),
        $inc: { tokenVersion: 1 },
      },
      { new: true }
    );
  }

  async logoutAllDevices(userId) {
    return await User.findByIdAndUpdate(
      userId,
      { $inc: { tokenVersion: 1 } },
      { new: true }
    );
  }

  async touchLastActive(userId) {
    return await AdminProfile.findOneAndUpdate(
      { user: userId },
      { lastActiveAt: new Date() },
      { new: true }
    );
  }

  async getLoginHistory(userId, limit = 20) {
    const user = await User.findById(userId).select("loginHistory");
    return (user?.loginHistory || []).slice(0, limit);
  }
}

export default new AdminRepository();
