import bookingAnalyticsService from "../services/bookingAnalytics.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

// ======================================
// Search Bookings (Admin)
// ======================================

export const searchBookings = asyncHandler(async (req, res) => {
  const result = await bookingAnalyticsService.searchBookings(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Bookings searched successfully.",
      result
    )
  );
});

// ======================================
// Filter Bookings (Admin)
// ======================================

export const filterBookings = asyncHandler(async (req, res) => {
  const result = await bookingAnalyticsService.filterBookings(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Bookings filtered successfully.",
      result
    )
  );
});

// ======================================
// List Bookings (Admin)
// ======================================

export const listBookings = asyncHandler(async (req, res) => {
  const result = await bookingAnalyticsService.listBookings(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Bookings fetched successfully.",
      result
    )
  );
});

// ======================================
// Dashboard Analytics (Admin)
// ======================================

export const getBookingAnalytics = asyncHandler(async (req, res) => {
  const analytics =
    await bookingAnalyticsService.getDashboardAnalytics();

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Booking analytics fetched successfully.",
      analytics
    )
  );
});
