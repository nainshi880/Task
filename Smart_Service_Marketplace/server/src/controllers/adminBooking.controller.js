import adminBookingService from "../services/adminBooking.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

function actorContext(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

export const listAdminBookings = asyncHandler(async (req, res) => {
  const result = await adminBookingService.listBookings(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Bookings fetched successfully.", result)
  );
});

export const searchAdminBookings = asyncHandler(async (req, res) => {
  const result = await adminBookingService.searchBookings(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Booking search results.", result)
  );
});

export const filterAdminBookings = asyncHandler(async (req, res) => {
  const result = await adminBookingService.filterBookings(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Filtered bookings fetched.", result)
  );
});

export const getAdminBookingDetails = asyncHandler(async (req, res) => {
  const result = await adminBookingService.getBookingDetails(
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Booking details fetched.", result)
  );
});

export const getAdminBookingTimeline = asyncHandler(async (req, res) => {
  const result = await adminBookingService.getBookingTimeline(
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Booking timeline fetched.", result)
  );
});

export const reassignBookingTechnician = asyncHandler(async (req, res) => {
  const result = await adminBookingService.reassignTechnician(
    req.params.bookingId,
    req.user._id,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, result)
  );
});

export const cancelAdminBooking = asyncHandler(async (req, res) => {
  const result = await adminBookingService.cancelBooking(
    req.params.bookingId,
    req.user._id,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, {
      booking: result.booking,
    })
  );
});

export const refundAdminBooking = asyncHandler(async (req, res) => {
  const result = await adminBookingService.refundBooking(
    req.params.bookingId,
    req.user,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, {
      booking: result.booking,
      payment: result.payment,
      refund: result.refund,
    })
  );
});

export const getAdminBookingReports = asyncHandler(async (req, res) => {
  const result = await adminBookingService.getReports(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Booking reports fetched.", result)
  );
});
