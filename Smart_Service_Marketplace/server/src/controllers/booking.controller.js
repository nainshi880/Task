import bookingService from "../services/booking.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

// ======================================
// Create Booking
// ======================================

export const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(
    req.user._id,
    req.body,
    req.files || [],
    {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }
  );

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Booking created successfully.",
      booking
    )
  );
});

// ======================================
// Get Booking by ID
// ======================================

export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingById(
    req.user._id,
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Booking fetched successfully.",
      booking
    )
  );
});

// ======================================
// Get Customer Bookings
// ======================================

export const getCustomerBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getCustomerBookings(
    req.user._id,
    req.query
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Bookings fetched successfully.",
      result
    )
  );
});

// ======================================
// Update Booking
// ======================================

export const updateBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.updateBooking(
    req.user._id,
    req.params.bookingId,
    req.body
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Booking updated successfully.",
      booking
    )
  );
});

// ======================================
// Cancel Booking
// ======================================

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking(
    req.user._id,
    req.params.bookingId,
    req.body.cancellationReason
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Booking cancelled successfully.",
      booking
    )
  );
});

// ======================================
// Upload Issue Images
// ======================================

export const uploadIssueImages = asyncHandler(async (req, res) => {
  const booking = await bookingService.uploadIssueImages(
    req.user._id,
    req.params.bookingId,
    req.files || []
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Issue images uploaded successfully.",
      booking
    )
  );
});
