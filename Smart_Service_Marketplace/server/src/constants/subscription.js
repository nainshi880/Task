export const SUBSCRIPTION_TIER = {
  FREE: "free",
  PRO: "pro",
};

export const SUBSCRIPTION_STATUS = {
  CREATED: "created",
  AUTHENTICATED: "authenticated",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  HALTED: "halted",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  EXPIRED: "expired",
};

/** Statuses that grant Pro feature access */
export const ACTIVE_PRO_STATUSES = [
  SUBSCRIPTION_STATUS.AUTHENTICATED,
  SUBSCRIPTION_STATUS.ACTIVE,
];

export const SUBSCRIPTION_INTERVAL = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
};

/** Default limits when plan document is missing */
export const DEFAULT_PLAN_LIMITS = {
  [SUBSCRIPTION_TIER.FREE]: {
    maxJobClaimsPerMonth: 3,
    priorityBoost: 0,
    analyticsAccess: false,
    unlimitedClaims: false,
  },
  [SUBSCRIPTION_TIER.PRO]: {
    maxJobClaimsPerMonth: null,
    priorityBoost: 15,
    analyticsAccess: true,
    unlimitedClaims: true,
  },
};

export const SUBSCRIPTION_PRIORITY_WEIGHT = 15;

export default {
  SUBSCRIPTION_TIER,
  SUBSCRIPTION_STATUS,
  ACTIVE_PRO_STATUSES,
  SUBSCRIPTION_INTERVAL,
  DEFAULT_PLAN_LIMITS,
  SUBSCRIPTION_PRIORITY_WEIGHT,
};
