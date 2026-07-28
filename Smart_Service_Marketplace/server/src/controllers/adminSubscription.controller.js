import subscriptionService from "../services/subscription.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const adminListPlans = asyncHandler(async (req, res) => {
  const plans = await subscriptionService.adminListPlans();

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Subscription plans fetched successfully.",
      plans
    )
  );
});

export const adminUpsertPlan = asyncHandler(async (req, res) => {
  const plan = await subscriptionService.adminUpsertPlan(
    req.params.planId || null,
    req.body,
    req.user._id
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Subscription plan saved successfully.",
      plan
    )
  );
});

export const adminSyncPlanToRazorpay = asyncHandler(async (req, res) => {
  const plan = await subscriptionService.adminSyncPlanToRazorpay(
    req.params.planId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Plan synced to Razorpay successfully.",
      plan
    )
  );
});

export const adminListSubscriptions = asyncHandler(async (req, res) => {
  const result = await subscriptionService.adminListSubscriptions(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Subscriptions fetched successfully.",
      result
    )
  );
});

export const adminGetSubscriptionAnalytics = asyncHandler(async (req, res) => {
  const analytics = await subscriptionService.adminGetAnalytics();

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Subscription analytics fetched successfully.",
      analytics
    )
  );
});

export const adminUpdateSubscriptionStatus = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.adminUpdateSubscriptionStatus(
    req.params.subscriptionId,
    req.body,
    req.user._id
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Subscription updated successfully.",
      subscription
    )
  );
});
