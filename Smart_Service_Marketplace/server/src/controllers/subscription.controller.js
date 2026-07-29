import subscriptionService from "../services/subscription.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const listSubscriptionPlans = asyncHandler(async (req, res) => {
  const plans = await subscriptionService.listPlans();

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Subscription plans fetched successfully.",
      plans
    )
  );
});

export const getCurrentSubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.getCurrentSubscription(
    req.user._id
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Subscription status fetched successfully.",
      subscription
    )
  );
});

export const createProSubscription = asyncHandler(async (req, res) => {
  const result = await subscriptionService.createProSubscription(req.user._id, {
    interval: req.body.interval,
    planId: req.body.planId,
  });

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Pro subscription initiated. Complete payment to activate.",
      result
    )
  );
});

export const verifySubscriptionPayment = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.verifySubscriptionPayment(
    req.user._id,
    req.body
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Subscription payment verified successfully.",
      subscription
    )
  );
});

export const cancelSubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.cancelSubscription(
    req.user._id,
    {
      cancelAtPeriodEnd: req.body.cancelAtPeriodEnd !== false,
    }
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Subscription cancellation scheduled.",
      subscription
    )
  );
});
