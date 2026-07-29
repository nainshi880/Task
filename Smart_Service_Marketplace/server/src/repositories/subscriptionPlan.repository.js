import SubscriptionPlan from "../models/SubscriptionPlan.js";
import {
  DEFAULT_PLAN_LIMITS,
  SUBSCRIPTION_INTERVAL,
  SUBSCRIPTION_TIER,
} from "../constants/subscription.js";

const DEFAULT_PLANS = [
  {
    code: SUBSCRIPTION_TIER.FREE,
    name: "Free",
    description: "Get started with limited monthly job claims.",
    price: 0,
    priceInPaise: 0,
    interval: SUBSCRIPTION_INTERVAL.MONTHLY,
    intervalCount: 1,
    features: [
      "Up to 3 job claims per month",
      "Basic job notifications",
      "Customer chat",
    ],
    limits: DEFAULT_PLAN_LIMITS[SUBSCRIPTION_TIER.FREE],
    sortOrder: 0,
    isActive: true,
  },
  {
    code: SUBSCRIPTION_TIER.PRO,
    name: "Pro Monthly",
    description:
      "Unlimited claims, priority matching, and performance insights — billed monthly.",
    price: 999,
    priceInPaise: 99900,
    interval: SUBSCRIPTION_INTERVAL.MONTHLY,
    intervalCount: 1,
    features: [
      "Unlimited job claims",
      "Priority in job matching",
      "Performance analytics",
      "Pro badge on profile",
    ],
    limits: DEFAULT_PLAN_LIMITS[SUBSCRIPTION_TIER.PRO],
    sortOrder: 1,
    isActive: true,
  },
  {
    code: SUBSCRIPTION_TIER.PRO,
    name: "Pro Yearly",
    description:
      "Same Pro benefits billed annually — save compared to paying monthly.",
    price: 9499,
    priceInPaise: 949900,
    interval: SUBSCRIPTION_INTERVAL.YEARLY,
    intervalCount: 1,
    features: [
      "Unlimited job claims",
      "Priority in job matching",
      "Performance analytics",
      "Pro badge on profile",
      "Best value annual billing",
    ],
    limits: DEFAULT_PLAN_LIMITS[SUBSCRIPTION_TIER.PRO],
    sortOrder: 2,
    isActive: true,
  },
];

class SubscriptionPlanRepository {
  async ensureDefaultPlans() {
    // Older schema had a unique index on `code` alone; drop it so Pro
    // monthly + yearly can coexist.
    try {
      await SubscriptionPlan.collection.dropIndex("code_1");
    } catch {
      // Index may not exist — ignore.
    }

    for (const plan of DEFAULT_PLANS) {
      const existing = await SubscriptionPlan.findOne({
        code: plan.code,
        interval: plan.interval,
      }).lean();

      if (!existing) {
        await SubscriptionPlan.create(plan);
        continue;
      }

      const priceChanged = existing.priceInPaise !== plan.priceInPaise;
      await SubscriptionPlan.updateOne(
        { _id: existing._id },
        {
          $set: {
            name: plan.name,
            description: plan.description,
            price: plan.price,
            priceInPaise: plan.priceInPaise,
            intervalCount: plan.intervalCount,
            features: plan.features,
            limits: plan.limits,
            sortOrder: plan.sortOrder,
            isActive: plan.isActive,
            ...(priceChanged ? { razorpayPlanId: null } : {}),
          },
        }
      );
    }
  }

  async listActive() {
    return SubscriptionPlan.find({ isActive: true })
      .sort({ sortOrder: 1, price: 1 })
      .lean();
  }

  async listAll() {
    return SubscriptionPlan.find().sort({ sortOrder: 1 }).lean();
  }

  async findByCode(code) {
    return SubscriptionPlan.findOne({ code }).lean();
  }

  async findByCodeAndInterval(code, interval = SUBSCRIPTION_INTERVAL.MONTHLY) {
    return SubscriptionPlan.findOne({ code, interval, isActive: true }).lean();
  }

  async findProPlans() {
    return SubscriptionPlan.find({
      code: SUBSCRIPTION_TIER.PRO,
      isActive: true,
    })
      .sort({ sortOrder: 1 })
      .lean();
  }

  async findById(id) {
    return SubscriptionPlan.findById(id).lean();
  }

  async create(data) {
    return SubscriptionPlan.create(data);
  }

  async updateById(id, data) {
    return SubscriptionPlan.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
  }
}

export default new SubscriptionPlanRepository();
