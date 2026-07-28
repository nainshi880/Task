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
    name: "Pro",
    description: "Unlimited claims, priority matching, and performance insights.",
    price: 999,
    priceInPaise: 99900,
    interval: SUBSCRIPTION_INTERVAL.MONTHLY,
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
];

class SubscriptionPlanRepository {
  async ensureDefaultPlans() {
    for (const plan of DEFAULT_PLANS) {
      await SubscriptionPlan.findOneAndUpdate(
        { code: plan.code },
        { $setOnInsert: plan },
        { upsert: true, new: true }
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
