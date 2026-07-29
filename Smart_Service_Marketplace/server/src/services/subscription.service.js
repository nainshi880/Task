import { getRazorpay, getRazorpayConfig } from "../config/razorpay.js";
import subscriptionRepository from "../repositories/subscription.repository.js";
import subscriptionPlanRepository from "../repositories/subscriptionPlan.repository.js";
import paymentRepository from "../repositories/payment.repository.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import withRetry, { isTransientError } from "../utils/retry.js";
import logger from "../utils/logger.js";
import {
  ACTIVE_PRO_STATUSES,
  DEFAULT_PLAN_LIMITS,
  SUBSCRIPTION_INTERVAL,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_TIER,
} from "../constants/subscription.js";
import PAYMENT_STATUS from "../constants/paymentStatus.js";

class SubscriptionService {
  ensureRazorpay() {
    const instance = getRazorpay();
    if (!instance) {
      throw new ApiError(
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
      );
    }
    return instance;
  }

  async ensurePlansSeeded() {
    await subscriptionPlanRepository.ensureDefaultPlans();
  }

  getPlanLimits(plan) {
    const tier = plan?.code || SUBSCRIPTION_TIER.FREE;
    const defaults = DEFAULT_PLAN_LIMITS[tier] || DEFAULT_PLAN_LIMITS[SUBSCRIPTION_TIER.FREE];
    return { ...defaults, ...(plan?.limits || {}) };
  }

  isProActive(subscription) {
    if (!subscription) return false;
    return (
      subscription.tier === SUBSCRIPTION_TIER.PRO &&
      ACTIVE_PRO_STATUSES.includes(subscription.status)
    );
  }

  canClaimJob(subscription) {
    if (!subscription) {
      return { allowed: false, reason: "No subscription found." };
    }

    if (this.isProActive(subscription)) {
      return { allowed: true, tier: SUBSCRIPTION_TIER.PRO };
    }

    if (
      subscription.tier === SUBSCRIPTION_TIER.FREE &&
      subscription.status === SUBSCRIPTION_STATUS.ACTIVE
    ) {
      const limits = this.getPlanLimits(subscription.plan);
      const max = limits.maxJobClaimsPerMonth;

      if (limits.unlimitedClaims || max == null) {
        return { allowed: true, tier: SUBSCRIPTION_TIER.FREE };
      }

      const used = subscription.jobsClaimedThisPeriod || 0;
      if (used >= max) {
        return {
          allowed: false,
          tier: SUBSCRIPTION_TIER.FREE,
          reason: `Free plan limit reached (${max} claims/month). Upgrade to Pro for unlimited claims.`,
          used,
          max,
        };
      }

      return {
        allowed: true,
        tier: SUBSCRIPTION_TIER.FREE,
        used,
        max,
        remaining: max - used,
      };
    }

    return {
      allowed: false,
      reason: "Active subscription required to accept jobs.",
    };
  }

  formatSubscriptionSummary(subscription, plans = []) {
    if (!subscription) {
      const freePlan = plans.find((p) => p.code === SUBSCRIPTION_TIER.FREE);
      const limits = this.getPlanLimits(freePlan);
      return {
        tier: SUBSCRIPTION_TIER.FREE,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        plan: freePlan || null,
        isPro: false,
        limits,
        usage: { jobsClaimedThisPeriod: 0 },
        canClaimJobs: true,
        cancelAtPeriodEnd: false,
      };
    }

    const limits = this.getPlanLimits(subscription.plan);
    const access = this.canClaimJob(subscription);

    return {
      _id: subscription._id,
      tier: subscription.tier,
      status: subscription.status,
      plan: subscription.plan,
      isPro: this.isProActive(subscription),
      limits,
      usage: {
        jobsClaimedThisPeriod: subscription.jobsClaimedThisPeriod || 0,
      },
      canClaimJobs: access.allowed,
      claimRestriction: access.allowed ? null : access.reason,
      remainingClaims: access.remaining ?? null,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      cancelledAt: subscription.cancelledAt,
      razorpaySubscriptionId: subscription.razorpaySubscriptionId,
    };
  }

  async ensureFreeSubscription(technicianId) {
    await this.ensurePlansSeeded();

    const existing = await subscriptionRepository.findFreeForTechnician(
      technicianId
    );
    if (existing) return existing;

    const freePlan = await subscriptionPlanRepository.findByCode(
      SUBSCRIPTION_TIER.FREE
    );
    if (!freePlan) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Free subscription plan is not configured."
      );
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    return subscriptionRepository.create({
      technician: technicianId,
      plan: freePlan._id,
      tier: SUBSCRIPTION_TIER.FREE,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      jobsClaimedThisPeriod: 0,
    });
  }

  async listPlans() {
    await this.ensurePlansSeeded();
    return subscriptionPlanRepository.listActive();
  }

  async getCurrentSubscription(technicianId) {
    await this.ensurePlansSeeded();
    await this.ensureFreeSubscription(technicianId);

    const [subscription, plans] = await Promise.all([
      subscriptionRepository.findCurrentForTechnician(technicianId),
      subscriptionPlanRepository.listActive(),
    ]);

    return this.formatSubscriptionSummary(subscription, plans);
  }

  normalizePhone(phone) {
    if (!phone) return "";
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
    if (String(phone).startsWith("+") && digits.length >= 10) {
      return `+${digits}`;
    }
    return digits ? `+${digits}` : "";
  }

  async getTechnicianCheckoutProfile(technicianId) {
    const User = (await import("../models/User.js")).default;
    const TechnicianProfile = (await import("../models/TechnicianProfile.js"))
      .default;

    const [user, profile] = await Promise.all([
      User.findById(technicianId).select("name email phone").lean(),
      TechnicianProfile.findOne({ user: technicianId })
        .select("fullName phone")
        .lean(),
    ]);

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Technician not found.");
    }

    const name = profile?.fullName || user.name || "Technician";
    const email = user.email || "";
    const contact = this.normalizePhone(profile?.phone || user.phone || "");

    return { name, email, contact };
  }

  async ensureRazorpayCustomer(razorpay, technicianId, profile) {
    if (!profile.email && !profile.contact) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Add email and phone on your profile before upgrading to Pro."
      );
    }

    const customerPayload = {
      name: profile.name,
      email: profile.email || undefined,
      contact: profile.contact || undefined,
      fail_existing: 0,
      notes: {
        technicianId: String(technicianId),
      },
    };

    const customer = await withRetry(
      () => razorpay.customers.create(customerPayload),
      { shouldRetry: isTransientError }
    );

    return customer.id;
  }

  async createProSubscription(technicianId, options = {}) {
    await this.ensurePlansSeeded();

    const interval =
      options.interval === SUBSCRIPTION_INTERVAL.YEARLY
        ? SUBSCRIPTION_INTERVAL.YEARLY
        : SUBSCRIPTION_INTERVAL.MONTHLY;

    const current = await subscriptionRepository.findCurrentForTechnician(
      technicianId
    );
    if (this.isProActive(current)) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "You already have an active Pro subscription."
      );
    }

    let proPlan = null;
    if (options.planId) {
      proPlan = await subscriptionPlanRepository.findById(options.planId);
      if (
        !proPlan ||
        proPlan.code !== SUBSCRIPTION_TIER.PRO ||
        !proPlan.isActive
      ) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid Pro plan.");
      }
    } else {
      proPlan = await subscriptionPlanRepository.findByCodeAndInterval(
        SUBSCRIPTION_TIER.PRO,
        interval
      );
    }

    if (!proPlan?.isActive) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Pro plan is not available."
      );
    }

    const razorpay = this.ensureRazorpay();
    const { keyId } = getRazorpayConfig();
    const checkoutProfile =
      await this.getTechnicianCheckoutProfile(technicianId);

    const currentPlanId = String(current?.plan?._id || current?.plan || "");
    const selectedPlanId = String(proPlan._id);

    // Reuse an unfinished Pro subscription checkout if still in created state
    // and it matches the selected billing interval/plan.
    if (
      current?.tier === SUBSCRIPTION_TIER.PRO &&
      current.status === SUBSCRIPTION_STATUS.CREATED &&
      current.razorpaySubscriptionId &&
      currentPlanId === selectedPlanId
    ) {
      try {
        const existing = await razorpay.subscriptions.fetch(
          current.razorpaySubscriptionId
        );
        const reusable =
          existing?.status === "created" || existing?.status === "authenticated";

        if (reusable) {
          return {
            subscriptionId: current._id,
            razorpaySubscriptionId: current.razorpaySubscriptionId,
            razorpayKeyId: keyId,
            shortUrl: existing.short_url || current.notes?.shortUrl || null,
            status: current.status,
            plan: proPlan,
            prefill: checkoutProfile,
          };
        }
      } catch (error) {
        logger.warn("Could not reuse existing Razorpay subscription", {
          message: error.message,
          razorpaySubscriptionId: current.razorpaySubscriptionId,
        });
      }
    }

    let razorpayPlanId = proPlan.razorpayPlanId;
    if (!razorpayPlanId) {
      const createdPlan = await withRetry(
        () =>
          razorpay.plans.create({
            period: proPlan.interval || "monthly",
            interval: proPlan.intervalCount || 1,
            item: {
              name: proPlan.name,
              amount: proPlan.priceInPaise,
              currency: proPlan.currency || "INR",
              description: proPlan.description || "Technician Pro subscription",
            },
          }),
        { shouldRetry: isTransientError }
      );

      razorpayPlanId = createdPlan.id;
      await subscriptionPlanRepository.updateById(proPlan._id, {
        razorpayPlanId,
      });
    }

    const razorpayCustomerId = await this.ensureRazorpayCustomer(
      razorpay,
      technicianId,
      checkoutProfile
    );

    // yearly: 10 years of renewals; monthly: 120 months (~10 years)
    const totalCount =
      proPlan.interval === SUBSCRIPTION_INTERVAL.YEARLY ? 10 : 120;

    const rpSubscription = await withRetry(
      () =>
        razorpay.subscriptions.create({
          plan_id: razorpayPlanId,
          customer_id: razorpayCustomerId,
          customer_notify: 1,
          total_count: totalCount,
          notes: {
            technicianId: String(technicianId),
            tier: SUBSCRIPTION_TIER.PRO,
            planId: String(proPlan._id),
            interval: proPlan.interval,
          },
        }),
      { shouldRetry: isTransientError }
    );

    const subscription = await subscriptionRepository.create({
      technician: technicianId,
      plan: proPlan._id,
      tier: SUBSCRIPTION_TIER.PRO,
      status: SUBSCRIPTION_STATUS.CREATED,
      razorpaySubscriptionId: rpSubscription.id,
      razorpayCustomerId,
      notes: {
        shortUrl: rpSubscription.short_url,
        interval: proPlan.interval,
      },
    });

    return {
      subscriptionId: subscription._id,
      razorpaySubscriptionId: rpSubscription.id,
      razorpayKeyId: keyId,
      shortUrl: rpSubscription.short_url,
      status: subscription.status,
      plan: proPlan,
      prefill: checkoutProfile,
    };
  }

  async verifySubscriptionPayment(technicianId, body = {}) {
    const {
      razorpay_subscription_id: razorpaySubscriptionId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = body;

    if (!razorpaySubscriptionId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "razorpay_subscription_id is required."
      );
    }

    const subscription = await subscriptionRepository.findByRazorpayId(
      razorpaySubscriptionId
    );

    if (!subscription) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Subscription not found.");
    }

    if (String(subscription.technician) !== String(technicianId)) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Access denied.");
    }

    if (razorpayPaymentId && razorpaySignature) {
      const { keySecret } = getRazorpayConfig();
      const crypto = await import("crypto");
      const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
        .digest("hex");

      if (expected !== razorpaySignature) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Invalid subscription payment signature."
        );
      }
    }

    const razorpay = this.ensureRazorpay();
    const rpSub = await razorpay.subscriptions.fetch(razorpaySubscriptionId);

    await this.syncFromRazorpayEntity(subscription, rpSub, {
      razorpayPaymentId,
    });

    return this.getCurrentSubscription(technicianId);
  }

  async cancelSubscription(technicianId, { cancelAtPeriodEnd = true } = {}) {
    const subscription = await subscriptionRepository.findCurrentForTechnician(
      technicianId
    );

    if (!subscription || subscription.tier !== SUBSCRIPTION_TIER.PRO) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "No active Pro subscription to cancel."
      );
    }

    if (!subscription.razorpaySubscriptionId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Subscription is not linked to Razorpay."
      );
    }

    const razorpay = this.ensureRazorpay();

    if (cancelAtPeriodEnd) {
      await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId, {
        cancel_at_cycle_end: 1,
      });

      await subscriptionRepository.updateById(subscription._id, {
        cancelAtPeriodEnd: true,
      });
    } else {
      await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId, {
        cancel_at_cycle_end: 0,
      });

      await subscriptionRepository.updateById(subscription._id, {
        status: SUBSCRIPTION_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancelAtPeriodEnd: false,
      });
    }

    return this.getCurrentSubscription(technicianId);
  }

  async syncFromRazorpayEntity(subscription, entity, { razorpayPaymentId } = {}) {
    const statusMap = {
      created: SUBSCRIPTION_STATUS.CREATED,
      authenticated: SUBSCRIPTION_STATUS.AUTHENTICATED,
      active: SUBSCRIPTION_STATUS.ACTIVE,
      pending: SUBSCRIPTION_STATUS.CREATED,
      halted: SUBSCRIPTION_STATUS.HALTED,
      cancelled: SUBSCRIPTION_STATUS.CANCELLED,
      completed: SUBSCRIPTION_STATUS.COMPLETED,
      expired: SUBSCRIPTION_STATUS.EXPIRED,
      paused: SUBSCRIPTION_STATUS.HALTED,
    };

    const rpStatus = (entity.status || "").toLowerCase();
    const mappedStatus = statusMap[rpStatus] || subscription.status;

    const currentStart = entity.current_start
      ? new Date(entity.current_start * 1000)
      : subscription.currentPeriodStart;
    const currentEnd = entity.current_end
      ? new Date(entity.current_end * 1000)
      : subscription.currentPeriodEnd;

    const update = {
      status: mappedStatus,
      currentPeriodStart: currentStart,
      currentPeriodEnd: currentEnd,
      cancelAtPeriodEnd: Boolean(entity.cancel_at_cycle_end),
    };

    if (mappedStatus === SUBSCRIPTION_STATUS.CANCELLED) {
      update.cancelledAt = new Date();
    }

    if (razorpayPaymentId) {
      update.lastPaymentAt = new Date();
    }

    const updated = await subscriptionRepository.updateById(
      subscription._id,
      update
    );

    if (razorpayPaymentId && ACTIVE_PRO_STATUSES.includes(mappedStatus)) {
      await this.recordSubscriptionPayment({
        subscription: updated || subscription,
        razorpayPaymentId,
        amount: subscription.plan?.price || 0,
        amountInPaise: subscription.plan?.priceInPaise || 0,
      });
    }

    return updated;
  }

  async recordSubscriptionPayment({
    subscription,
    razorpayPaymentId,
    amount,
    amountInPaise,
  }) {
    if (!razorpayPaymentId) return null;

    const existing = await paymentRepository.findByPaymentId(razorpayPaymentId);
    if (existing) return existing;

    return paymentRepository.create({
      customer: subscription.technician,
      purpose: "subscription",
      subscription: subscription._id,
      amount: amount || subscription.plan?.price || 0,
      amountInPaise: amountInPaise || subscription.plan?.priceInPaise || 0,
      currency: subscription.plan?.currency || "INR",
      status: PAYMENT_STATUS.PAID,
      razorpayPaymentId,
      paidAt: new Date(),
      notes: {
        tier: subscription.tier,
        razorpaySubscriptionId: subscription.razorpaySubscriptionId,
      },
    });
  }

  async handleWebhookEvent(event, eventId = null) {
    const eventName = event.event;
    const entity = event.payload?.subscription?.entity;

    if (!entity?.id) {
      logger.warn("Subscription webhook missing entity", { eventName, eventId });
      return { handled: false, event: eventName, reason: "No subscription entity" };
    }

    let subscription = await subscriptionRepository.findByRazorpayId(entity.id);

    if (!subscription && event.payload?.subscription?.entity?.notes?.technicianId) {
      await this.ensurePlansSeeded();
      const notes = event.payload.subscription.entity.notes || {};
      let proPlan = notes.planId
        ? await subscriptionPlanRepository.findById(notes.planId)
        : null;
      if (!proPlan) {
        proPlan = await subscriptionPlanRepository.findByCodeAndInterval(
          SUBSCRIPTION_TIER.PRO,
          notes.interval === SUBSCRIPTION_INTERVAL.YEARLY
            ? SUBSCRIPTION_INTERVAL.YEARLY
            : SUBSCRIPTION_INTERVAL.MONTHLY
        );
      }
      subscription = await subscriptionRepository.create({
        technician: notes.technicianId,
        plan: proPlan._id,
        tier: SUBSCRIPTION_TIER.PRO,
        status: SUBSCRIPTION_STATUS.CREATED,
        razorpaySubscriptionId: entity.id,
      });
    }

    if (!subscription) {
      logger.warn("Subscription not found for webhook", {
        razorpaySubscriptionId: entity.id,
        eventName,
      });
      return {
        handled: false,
        event: eventName,
        reason: "Subscription not found",
      };
    }

    const paymentEntity = event.payload?.payment?.entity;
    const razorpayPaymentId = paymentEntity?.id || null;

    await this.syncFromRazorpayEntity(subscription, entity, {
      razorpayPaymentId,
    });

    if (eventName === "subscription.charged" && paymentEntity) {
      await this.recordSubscriptionPayment({
        subscription,
        razorpayPaymentId,
        amount: Number(paymentEntity.amount || 0) / 100,
        amountInPaise: Number(paymentEntity.amount || 0),
      });

      await subscriptionRepository.updateById(subscription._id, {
        jobsClaimedThisPeriod: 0,
        lastPaymentAt: new Date(),
      });
    }

    logger.info("Subscription webhook processed", {
      eventName,
      subscriptionId: String(subscription._id),
      razorpaySubscriptionId: entity.id,
    });

    return { handled: true, event: eventName, subscriptionId: subscription._id };
  }

  async assertCanClaimJob(technicianId) {
    await this.ensureFreeSubscription(technicianId);
    const subscription =
      await subscriptionRepository.findCurrentForTechnician(technicianId);
    const access = this.canClaimJob(subscription);

    if (!access.allowed) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, access.reason);
    }

    return { subscription, access };
  }

  async recordJobClaim(technicianId) {
    const { subscription } = await this.assertCanClaimJob(technicianId);

    if (
      subscription.tier === SUBSCRIPTION_TIER.FREE &&
      !this.getPlanLimits(subscription.plan).unlimitedClaims
    ) {
      await subscriptionRepository.incrementJobClaims(subscription._id);
    }
  }

  async getTechnicianAccessMap(technicianIds) {
    await this.ensurePlansSeeded();
    const map = await subscriptionRepository.getTechnicianAccessMap(
      technicianIds
    );

    const result = new Map();
    for (const id of technicianIds) {
      const sub = map.get(String(id));
      if (sub) {
        result.set(String(id), {
          tier: sub.tier,
          isPro: this.isProActive(sub),
          canReceiveOffers: this.canClaimJob(sub).allowed,
          priorityBoost: this.isProActive(sub)
            ? this.getPlanLimits(sub.plan).priorityBoost || 0
            : 0,
        });
      } else {
        result.set(String(id), {
          tier: SUBSCRIPTION_TIER.FREE,
          isPro: false,
          canReceiveOffers: true,
          priorityBoost: 0,
        });
      }
    }

    return result;
  }

  // ======================================
  // Admin
  // ======================================

  async adminListPlans() {
    await this.ensurePlansSeeded();
    return subscriptionPlanRepository.listAll();
  }

  async adminUpsertPlan(planId, data, adminId) {
    await this.ensurePlansSeeded();

    const payload = {
      name: data.name,
      description: data.description,
      price: Number(data.price),
      priceInPaise: Math.round(Number(data.price) * 100),
      currency: data.currency || "INR",
      interval: data.interval,
      intervalCount: data.intervalCount || 1,
      features: data.features || [],
      limits: data.limits || {},
      isActive: data.isActive !== false,
      sortOrder: data.sortOrder ?? 0,
    };

    if (planId) {
      return subscriptionPlanRepository.updateById(planId, payload);
    }

    return subscriptionPlanRepository.create({
      ...payload,
      code: data.code,
    });
  }

  async adminSyncPlanToRazorpay(planId) {
    const plan = await subscriptionPlanRepository.findById(planId);
    if (!plan) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Plan not found.");
    }
    if (plan.code === SUBSCRIPTION_TIER.FREE) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Free plan does not require Razorpay sync."
      );
    }

    const razorpay = this.ensureRazorpay();
    const createdPlan = await razorpay.plans.create({
      period: plan.interval || "monthly",
      interval: plan.intervalCount || 1,
      item: {
        name: plan.name,
        amount: plan.priceInPaise,
        currency: plan.currency || "INR",
        description: plan.description || plan.name,
      },
    });

    return subscriptionPlanRepository.updateById(planId, {
      razorpayPlanId: createdPlan.id,
    });
  }

  async adminListSubscriptions(query = {}) {
    return subscriptionRepository.list(query);
  }

  async adminGetAnalytics() {
    await this.ensurePlansSeeded();
    return subscriptionRepository.getAnalytics();
  }

  async adminUpdateSubscriptionStatus(subscriptionId, { status }, adminId) {
    const subscription = await subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Subscription not found.");
    }

    return subscriptionRepository.updateById(subscriptionId, {
      status,
      notes: {
        ...(subscription.notes || {}),
        adminOverride: { status, by: adminId, at: new Date() },
      },
    });
  }
}

export default new SubscriptionService();
