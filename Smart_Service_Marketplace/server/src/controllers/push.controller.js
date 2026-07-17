import pushService from "../services/push.service.js";
import notificationService from "../services/notification.service.js";
import Booking from "../models/Booking.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import ROLES from "../constants/roles.js";

export const registerDevice = asyncHandler(async (req, res) => {
  const device = await pushService.registerDevice(req.user._id, req.body);

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Device registered for push notifications.",
      device
    )
  );
});

export const unregisterDevice = asyncHandler(async (req, res) => {
  const device = await pushService.unregisterDevice(
    req.user._id,
    req.params.token
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Device unregistered from push notifications.",
      device
    )
  );
});

export const listDevices = asyncHandler(async (req, res) => {
  const devices = await pushService.listDevices(req.user._id);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Devices fetched successfully.",
      devices
    )
  );
});

export const getPushProviders = asyncHandler(async (_req, res) => {
  const status = pushService.getProvidersStatus();

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Push providers status fetched.",
      status
    )
  );
});

export const sendTestPush = asyncHandler(async (req, res) => {
  const result = await pushService.sendToUser(req.user._id, {
    title: req.body.title || "Test Notification",
    body: req.body.body || "Push notifications are working.",
    event: "test",
    data: { type: "test" },
  });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Test push processed.",
      result
    )
  );
});

export const sendReviewReminder = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId).select(
    "customer serviceName status"
  );

  if (!booking) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
  }

  const isOwner = booking.customer.toString() === req.user._id.toString();
  const isAdmin = req.user.role === ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, "Access denied.");
  }

  const result = await pushService.notifyReviewReminder(
    booking.customer,
    booking
  );

  await notificationService.notifyBooking(booking.customer, {
    title: "Review Reminder",
    message: `How was your ${booking.serviceName} experience? Leave a quick review.`,
    bookingId: booking._id,
    metadata: { event: "REVIEW_REMINDER" },
    actionUrl: `/bookings/${booking._id}/review`,
  });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Review reminder sent.", result)
  );
});
