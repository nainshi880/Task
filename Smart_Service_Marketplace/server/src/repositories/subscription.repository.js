import Subscription from "../models/Subscription.js";
import {
  ACTIVE_PRO_STATUSES,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_TIER,
} from "../constants/subscription.js";

class SubscriptionRepository {
  async findById(id) {
    return Subscription.findById(id)
      .populate("plan")
      .populate("technician", "name email phone")
      .lean();
  }

  async findByRazorpayId(razorpaySubscriptionId) {
    return Subscription.findOne({ razorpaySubscriptionId })
      .populate("plan")
      .lean();
  }

  async findCurrentForTechnician(technicianId) {
    const active = await Subscription.findOne({
      technician: technicianId,
      status: { $in: [...ACTIVE_PRO_STATUSES, SUBSCRIPTION_STATUS.CREATED] },
      tier: SUBSCRIPTION_TIER.PRO,
    })
      .sort({ createdAt: -1 })
      .populate("plan")
      .lean();

    if (active) return active;

    return Subscription.findOne({
      technician: technicianId,
      tier: SUBSCRIPTION_TIER.FREE,
      status: SUBSCRIPTION_STATUS.ACTIVE,
    })
      .sort({ createdAt: -1 })
      .populate("plan")
      .lean();
  }

  async findFreeForTechnician(technicianId) {
    return Subscription.findOne({
      technician: technicianId,
      tier: SUBSCRIPTION_TIER.FREE,
    })
      .populate("plan")
      .lean();
  }

  async create(data, session = null) {
    const doc = new Subscription(data);
    return session ? doc.save({ session }) : doc.save();
  }

  async updateById(id, data, session = null) {
    const query = Subscription.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).populate("plan");

    return session ? query.session(session) : query.lean();
  }

  async updateByRazorpayId(razorpaySubscriptionId, data, session = null) {
    const query = Subscription.findOneAndUpdate(
      { razorpaySubscriptionId },
      data,
      { new: true, runValidators: true }
    ).populate("plan");

    return session ? query.session(session) : query.lean();
  }

  async list({
    page = 1,
    limit = 20,
    status,
    tier,
    technicianId,
    search,
  } = {}) {
    const filter = {};

    if (status) filter.status = status;
    if (tier) filter.tier = tier;
    if (technicianId) filter.technician = technicianId;

    if (search?.trim()) {
      const User = (await import("../models/User.js")).default;
      const users = await User.find({
        role: "technician",
        $or: [
          { name: new RegExp(search.trim(), "i") },
          { email: new RegExp(search.trim(), "i") },
        ],
      }).select("_id");

      filter.technician = { $in: users.map((u) => u._id) };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Subscription.find(filter)
        .populate("plan", "name code price interval")
        .populate("technician", "name email phone city")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subscription.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async getAnalytics() {
    const [statusBreakdown, tierBreakdown, proActive, totalRevenue] =
      await Promise.all([
        Subscription.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Subscription.aggregate([
          { $group: { _id: "$tier", count: { $sum: 1 } } },
        ]),
        Subscription.countDocuments({
          tier: SUBSCRIPTION_TIER.PRO,
          status: { $in: ACTIVE_PRO_STATUSES },
        }),
        Subscription.aggregate([
          {
            $match: {
              tier: SUBSCRIPTION_TIER.PRO,
              lastPaymentAt: { $ne: null },
            },
          },
          {
            $lookup: {
              from: "subscriptionplans",
              localField: "plan",
              foreignField: "_id",
              as: "planDoc",
            },
          },
          { $unwind: { path: "$planDoc", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: null,
              estimatedMrr: {
                $sum: {
                  $cond: [
                    { $eq: ["$planDoc.interval", "yearly"] },
                    { $divide: ["$planDoc.price", 12] },
                    "$planDoc.price",
                  ],
                },
              },
            },
          },
        ]),
      ]);

    const freeCount =
      tierBreakdown.find((t) => t._id === SUBSCRIPTION_TIER.FREE)?.count || 0;
    const proCount =
      tierBreakdown.find((t) => t._id === SUBSCRIPTION_TIER.PRO)?.count || 0;

    return {
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s._id,
        count: s.count,
      })),
      tierBreakdown: tierBreakdown.map((t) => ({
        tier: t._id,
        count: t.count,
      })),
      activeProSubscriptions: proActive,
      freeSubscriptions: freeCount,
      proSubscriptions: proCount,
      estimatedMrr: totalRevenue[0]?.estimatedMrr || 0,
    };
  }

  async getTechnicianAccessMap(technicianIds = []) {
    if (!technicianIds.length) return new Map();

    const subs = await Subscription.find({
      technician: { $in: technicianIds },
      $or: [
        {
          tier: SUBSCRIPTION_TIER.PRO,
          status: { $in: ACTIVE_PRO_STATUSES },
        },
        {
          tier: SUBSCRIPTION_TIER.FREE,
          status: SUBSCRIPTION_STATUS.ACTIVE,
        },
      ],
    })
      .populate("plan")
      .lean();

    const map = new Map();
    for (const sub of subs) {
      const key = String(sub.technician);
      const existing = map.get(key);

      if (sub.tier === SUBSCRIPTION_TIER.PRO) {
        map.set(key, sub);
      } else if (!existing) {
        map.set(key, sub);
      }
    }

    return map;
  }

  async incrementJobClaims(subscriptionId, session = null) {
    const query = Subscription.findByIdAndUpdate(
      subscriptionId,
      { $inc: { jobsClaimedThisPeriod: 1 } },
      { new: true }
    );

    return session ? query.session(session) : query.lean();
  }
}

export default new SubscriptionRepository();
