import Coupon from "../models/Coupon.js";
import CouponUsage from "../models/CouponUsage.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import { COUPON_USAGE_STATUS } from "../constants/coupon.js";

class CouponRepository {
  async create(data) {
    return await Coupon.create(data);
  }

  async findById(couponId) {
    return await Coupon.findById(couponId).populate(
      "referrer",
      "name email referralCode"
    );
  }

  async findByCode(code) {
    return await Coupon.findOne({ code: String(code).toUpperCase().trim() })
      .populate("referrer", "name email referralCode");
  }

  async findByReferrer(userId) {
    return await Coupon.findOne({
      referrer: userId,
      category: "referral",
    });
  }

  async updateById(couponId, update) {
    return await Coupon.findByIdAndUpdate(couponId, update, {
      new: true,
      runValidators: true,
    });
  }

  async list({
    page = 1,
    limit = 10,
    category,
    isActive,
    search,
  } = {}) {
    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === true || isActive === "true";
    if (search) {
      filter.code = { $regex: String(search).trim(), $options: "i" };
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Coupon.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("referrer", "name email referralCode"),
      Coupon.countDocuments(filter),
    ]);

    return { items, total };
  }

  async incrementUsedCount(couponId, session = null) {
    const opts = { new: true };
    if (session) opts.session = session;
    return await Coupon.findByIdAndUpdate(
      couponId,
      { $inc: { usedCount: 1 } },
      opts
    );
  }

  async decrementUsedCount(couponId, session = null) {
    const opts = { new: true };
    if (session) opts.session = session;
    return await Coupon.findOneAndUpdate(
      { _id: couponId, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 } },
      opts
    );
  }

  async countCustomerUsages(couponId, customerId) {
    return await CouponUsage.countDocuments({
      coupon: couponId,
      customer: customerId,
      status: {
        $in: [COUPON_USAGE_STATUS.APPLIED, COUPON_USAGE_STATUS.REDEEMED],
      },
    });
  }

  async createUsage(data, session = null) {
    const docs = await CouponUsage.create(
      [data],
      session ? { session } : undefined
    );
    return docs[0];
  }

  async findActiveUsageByBooking(bookingId) {
    return await CouponUsage.findOne({
      booking: bookingId,
      status: COUPON_USAGE_STATUS.APPLIED,
    });
  }

  async releaseUsage(usageId, session = null) {
    const opts = { new: true };
    if (session) opts.session = session;
    return await CouponUsage.findByIdAndUpdate(
      usageId,
      { status: COUPON_USAGE_STATUS.RELEASED },
      opts
    );
  }

  async markUsageRedeemed(bookingId, session = null) {
    const opts = { new: true };
    if (session) opts.session = session;
    return await CouponUsage.findOneAndUpdate(
      { booking: bookingId, status: COUPON_USAGE_STATUS.APPLIED },
      { status: COUPON_USAGE_STATUS.REDEEMED },
      opts
    );
  }

  async findBookingForCustomer(bookingId, customerId) {
    return await Booking.findOne({
      _id: bookingId,
      customer: customerId,
    });
  }

  async updateBooking(bookingId, update, session = null) {
    const opts = { new: true, runValidators: true };
    if (session) opts.session = session;
    return await Booking.findByIdAndUpdate(bookingId, update, opts);
  }

  async countCustomerBookings(customerId) {
    return await Booking.countDocuments({
      customer: customerId,
      status: { $ne: "Cancelled" },
    });
  }

  async findUserById(userId) {
    return await User.findById(userId).select(
      "name email role referralCode referredBy"
    );
  }

  async findUserByReferralCode(code) {
    return await User.findOne({
      referralCode: String(code).toUpperCase().trim(),
      isDeleted: false,
    }).select("name email referralCode referredBy role");
  }

  async updateUser(userId, update) {
    return await User.findByIdAndUpdate(userId, update, {
      new: true,
      runValidators: true,
    }).select("name email referralCode referredBy");
  }
}

export default new CouponRepository();
