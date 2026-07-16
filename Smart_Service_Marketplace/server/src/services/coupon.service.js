import crypto from "crypto";
import couponRepository from "../repositories/coupon.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import PAGINATION from "../constants/pagination.js";
import withTransaction from "../utils/transaction.js";
import {
  COUPON_DISCOUNT_TYPE,
  COUPON_CATEGORY,
  COUPON_USAGE_STATUS,
} from "../constants/coupon.js";

class CouponService {
  normalizeCode(code) {
    return String(code || "")
      .toUpperCase()
      .trim();
  }

  calculateDiscount(coupon, orderAmount) {
    const amount = Number(orderAmount);
    let discountAmount = 0;

    if (coupon.discountType === COUPON_DISCOUNT_TYPE.PERCENTAGE) {
      discountAmount = (amount * Number(coupon.discountValue)) / 100;
      if (
        coupon.maxDiscountAmount !== null &&
        coupon.maxDiscountAmount !== undefined
      ) {
        discountAmount = Math.min(
          discountAmount,
          Number(coupon.maxDiscountAmount)
        );
      }
    } else {
      discountAmount = Number(coupon.discountValue);
    }

    discountAmount = Number(Math.min(discountAmount, amount).toFixed(2));
    const finalAmount = Number((amount - discountAmount).toFixed(2));

    return {
      originalAmount: amount,
      discountAmount,
      finalAmount: Math.max(finalAmount, 0),
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    };
  }

  // ======================================
  // Referral code helpers
  // ======================================

  generateReferralCode(name = "USER") {
    const prefix = String(name)
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 4)
      .toUpperCase()
      .padEnd(3, "X");
    const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `${prefix}${suffix}`;
  }

  async ensureReferralCode(userId) {
    const user = await couponRepository.findUserById(userId);
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found.");
    }

    if (user.referralCode) {
      let referralCoupon = await couponRepository.findByReferrer(userId);
      if (!referralCoupon) {
        referralCoupon = await this.createReferralCouponForUser(user);
      }
      return {
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        coupon: referralCoupon,
      };
    }

    let code;
    let attempts = 0;
    do {
      code = this.generateReferralCode(user.name);
      const existingUser = await couponRepository.findUserByReferralCode(code);
      const existingCoupon = await couponRepository.findByCode(code);
      if (!existingUser && !existingCoupon) break;
      attempts += 1;
    } while (attempts < 8);

    if (attempts >= 8) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Unable to generate referral code. Please try again."
      );
    }

    const updated = await couponRepository.updateUser(userId, {
      referralCode: code,
    });

    const referralCoupon = await this.createReferralCouponForUser({
      ...updated.toObject(),
      _id: userId,
      name: user.name,
    });

    return {
      referralCode: updated.referralCode,
      referredBy: updated.referredBy,
      coupon: referralCoupon,
    };
  }

  async createReferralCouponForUser(user) {
    const existing = await couponRepository.findByReferrer(user._id);
    if (existing) return existing;

    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 2);

    return await couponRepository.create({
      code: user.referralCode,
      title: `${user.name}'s referral coupon`,
      description: "Referral discount for new customers",
      discountType: COUPON_DISCOUNT_TYPE.PERCENTAGE,
      discountValue: 10,
      maxDiscountAmount: 200,
      minOrderAmount: 0,
      category: COUPON_CATEGORY.REFERRAL,
      firstOrderOnly: true,
      referrer: user._id,
      validFrom: new Date(),
      validUntil,
      usageLimit: null,
      perUserLimit: 1,
      isActive: true,
      createdBy: user._id,
    });
  }

  // ======================================
  // Validation
  // ======================================

  async validateCoupon(customerId, { code, amount, bookingId }) {
    const normalized = this.normalizeCode(code);
    if (!normalized) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Coupon code is required.");
    }

    const coupon = await couponRepository.findByCode(normalized);
    if (!coupon) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Invalid coupon code.");
    }

    await this.assertCouponUsable(coupon, customerId, {
      amount,
      bookingId,
    });

    const orderAmount = Number(amount);
    const pricing = this.calculateDiscount(coupon, orderAmount);

    return {
      valid: true,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      category: coupon.category,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      minOrderAmount: coupon.minOrderAmount,
      validUntil: coupon.validUntil,
      firstOrderOnly: coupon.firstOrderOnly || coupon.category === COUPON_CATEGORY.FIRST_ORDER,
      ...pricing,
      couponId: coupon._id,
    };
  }

  async assertCouponUsable(coupon, customerId, { amount, bookingId } = {}) {
    if (!coupon.isActive) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "This coupon is inactive.");
    }

    const now = new Date();
    if (coupon.validFrom && now < new Date(coupon.validFrom)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "This coupon is not active yet."
      );
    }

    if (coupon.validUntil && now > new Date(coupon.validUntil)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "This coupon has expired.");
    }

    if (
      coupon.usageLimit !== null &&
      coupon.usageLimit !== undefined &&
      coupon.usedCount >= coupon.usageLimit
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "This coupon has reached its usage limit."
      );
    }

    const userUsageCount = await couponRepository.countCustomerUsages(
      coupon._id,
      customerId
    );
    if (userUsageCount >= (coupon.perUserLimit || 1)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "You have already used this coupon the maximum number of times."
      );
    }

    const isFirstOrderCoupon =
      coupon.firstOrderOnly ||
      coupon.category === COUPON_CATEGORY.FIRST_ORDER ||
      coupon.category === COUPON_CATEGORY.REFERRAL;

    if (isFirstOrderCoupon) {
      let bookingCount = await couponRepository.countCustomerBookings(
        customerId
      );

      // Current unpaid booking being discounted should not block first-order
      if (bookingId) {
        const booking = await couponRepository.findBookingForCustomer(
          bookingId,
          customerId
        );
        if (booking && booking.status !== "Cancelled") {
          bookingCount = Math.max(bookingCount - 1, 0);
        }
      }

      if (bookingCount > 0) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "This coupon is valid for first orders only."
        );
      }
    }

    if (coupon.category === COUPON_CATEGORY.REFERRAL) {
      if (
        coupon.referrer &&
        coupon.referrer._id?.toString() === customerId.toString()
      ) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "You cannot use your own referral coupon."
        );
      }

      if (
        coupon.referrer &&
        coupon.referrer.toString() === customerId.toString()
      ) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "You cannot use your own referral coupon."
        );
      }
    }

    if (amount !== undefined && amount !== null) {
      const orderAmount = Number(amount);
      if (Number.isNaN(orderAmount) || orderAmount < 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid order amount.");
      }
      if (orderAmount < Number(coupon.minOrderAmount || 0)) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon.`
        );
      }
    }

    return true;
  }

  // ======================================
  // Apply / Remove on booking
  // ======================================

  async applyToBooking(customerId, { bookingId, code }) {
    const booking = await couponRepository.findBookingForCustomer(
      bookingId,
      customerId
    );

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    if (booking.paymentStatus === "Paid") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Cannot apply coupon to a paid booking."
      );
    }

    if (booking.status === "Cancelled") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Cannot apply coupon to a cancelled booking."
      );
    }

    if (booking.coupon) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "A coupon is already applied. Remove it before applying another."
      );
    }

    const baseAmount =
      booking.originalAmount !== null && booking.originalAmount !== undefined
        ? Number(booking.originalAmount)
        : Number(booking.amount);

    if (!baseAmount || baseAmount <= 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Booking amount must be greater than 0 before applying a coupon."
      );
    }

    const coupon = await couponRepository.findByCode(this.normalizeCode(code));
    if (!coupon) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Invalid coupon code.");
    }

    await this.assertCouponUsable(coupon, customerId, {
      amount: baseAmount,
      bookingId,
    });

    const pricing = this.calculateDiscount(coupon, baseAmount);
    const referrerId =
      coupon.category === COUPON_CATEGORY.REFERRAL
        ? coupon.referrer?._id || coupon.referrer
        : null;

    const result = await withTransaction(async (session) => {
      await couponRepository.incrementUsedCount(coupon._id, session);

      const usage = await couponRepository.createUsage(
        {
          coupon: coupon._id,
          customer: customerId,
          booking: booking._id,
          code: coupon.code,
          discountAmount: pricing.discountAmount,
          originalAmount: pricing.originalAmount,
          finalAmount: pricing.finalAmount,
          status: COUPON_USAGE_STATUS.APPLIED,
          referrer: referrerId,
        },
        session
      );

      const updatedBooking = await couponRepository.updateBooking(
        booking._id,
        {
          originalAmount: pricing.originalAmount,
          discountAmount: pricing.discountAmount,
          amount: pricing.finalAmount,
          coupon: coupon._id,
          couponCode: coupon.code,
        },
        session
      );

      if (referrerId) {
        const customer = await couponRepository.findUserById(customerId);
        if (customer && !customer.referredBy) {
          await couponRepository.updateUser(customerId, {
            referredBy: referrerId,
          });
        }
      }

      return { booking: updatedBooking, usage, pricing };
    });

    return {
      bookingId: booking._id,
      code: coupon.code,
      category: coupon.category,
      ...result.pricing,
      booking: result.booking,
    };
  }

  async removeFromBooking(customerId, bookingId) {
    const booking = await couponRepository.findBookingForCustomer(
      bookingId,
      customerId
    );

    if (!booking) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
    }

    if (booking.paymentStatus === "Paid") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Cannot remove coupon from a paid booking."
      );
    }

    if (!booking.coupon) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "No coupon is applied to this booking."
      );
    }

    const usage = await couponRepository.findActiveUsageByBooking(bookingId);
    const restoreAmount =
      booking.originalAmount !== null && booking.originalAmount !== undefined
        ? booking.originalAmount
        : booking.amount;

    await withTransaction(async (session) => {
      if (usage) {
        await couponRepository.releaseUsage(usage._id, session);
        await couponRepository.decrementUsedCount(usage.coupon, session);
      }

      await couponRepository.updateBooking(
        booking._id,
        {
          amount: restoreAmount,
          originalAmount: null,
          discountAmount: 0,
          coupon: null,
          couponCode: null,
        },
        session
      );
    });

    const updated = await couponRepository.findBookingForCustomer(
      bookingId,
      customerId
    );

    return {
      bookingId,
      amount: updated.amount,
      discountAmount: 0,
      couponRemoved: true,
      booking: updated,
    };
  }

  async markRedeemedForBooking(bookingId) {
    return await couponRepository.markUsageRedeemed(bookingId);
  }

  // ======================================
  // Admin CRUD
  // ======================================

  async createCoupon(adminId, data) {
    const code = this.normalizeCode(data.code);
    const existing = await couponRepository.findByCode(code);
    if (existing) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "A coupon with this code already exists."
      );
    }

    if (
      data.discountType === COUPON_DISCOUNT_TYPE.PERCENTAGE &&
      (data.discountValue <= 0 || data.discountValue > 100)
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Percentage discount must be between 1 and 100."
      );
    }

    if (
      data.discountType === COUPON_DISCOUNT_TYPE.FLAT &&
      data.discountValue <= 0
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Flat discount must be greater than 0."
      );
    }

    const validUntil = new Date(data.validUntil);
    if (Number.isNaN(validUntil.getTime()) || validUntil <= new Date()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "validUntil must be a future date."
      );
    }

    const category = data.category || COUPON_CATEGORY.GENERAL;

    const coupon = await couponRepository.create({
      code,
      title: data.title || code,
      description: data.description || "",
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxDiscountAmount: data.maxDiscountAmount ?? null,
      minOrderAmount: data.minOrderAmount || 0,
      category,
      firstOrderOnly:
        data.firstOrderOnly === true ||
        category === COUPON_CATEGORY.FIRST_ORDER,
      referrer: data.referrer || null,
      validFrom: data.validFrom ? new Date(data.validFrom) : new Date(),
      validUntil,
      usageLimit:
        data.usageLimit === undefined || data.usageLimit === null
          ? null
          : Number(data.usageLimit),
      perUserLimit: data.perUserLimit || 1,
      isActive: data.isActive !== false,
      createdBy: adminId,
    });

    return coupon;
  }

  async updateCoupon(couponId, data) {
    const coupon = await couponRepository.findById(couponId);
    if (!coupon) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Coupon not found.");
    }

    const update = {};
    const fields = [
      "title",
      "description",
      "discountType",
      "discountValue",
      "maxDiscountAmount",
      "minOrderAmount",
      "category",
      "firstOrderOnly",
      "usageLimit",
      "perUserLimit",
      "isActive",
    ];

    for (const field of fields) {
      if (data[field] !== undefined) update[field] = data[field];
    }

    if (data.validFrom !== undefined) {
      update.validFrom = new Date(data.validFrom);
    }
    if (data.validUntil !== undefined) {
      update.validUntil = new Date(data.validUntil);
    }

    if (data.code !== undefined) {
      const code = this.normalizeCode(data.code);
      const existing = await couponRepository.findByCode(code);
      if (existing && existing._id.toString() !== couponId.toString()) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          "A coupon with this code already exists."
        );
      }
      update.code = code;
    }

    return await couponRepository.updateById(couponId, update);
  }

  async getCoupon(couponId) {
    const coupon = await couponRepository.findById(couponId);
    if (!coupon) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Coupon not found.");
    }
    return coupon;
  }

  async listCoupons(query = {}) {
    const page = Number(query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(
      Number(query.limit) || PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MAX_LIMIT
    );

    const { items, total } = await couponRepository.list({
      page,
      limit,
      category: query.category,
      isActive: query.isActive,
      search: query.search,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async deactivateCoupon(couponId) {
    const coupon = await couponRepository.findById(couponId);
    if (!coupon) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Coupon not found.");
    }

    return await couponRepository.updateById(couponId, { isActive: false });
  }
}

export default new CouponService();
