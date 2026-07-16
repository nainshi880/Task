import bookingEventService from "../services/bookingEvent.service.js";
import bookingRepository from "../repositories/booking.repository.js";
import auditRepository from "../repositories/audit.repository.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import ROLES from "../constants/roles.js";

async function assertBookingAccess(req, bookingId) {
  const booking = await bookingRepository.findById(bookingId);

  if (!booking) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Booking not found.");
  }

  if (req.user.role === ROLES.ADMIN) {
    return booking;
  }

  if (req.user.role === ROLES.CUSTOMER) {
    const customerId =
      booking.customer?._id?.toString() || booking.customer?.toString();
    if (customerId !== req.user._id.toString()) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Access denied.");
    }
    return booking;
  }

  if (req.user.role === ROLES.TECHNICIAN) {
    const technicianId =
      booking.technician?._id?.toString() ||
      booking.technician?.toString();
    if (technicianId !== req.user._id.toString()) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "Access denied.");
    }
    return booking;
  }

  throw new ApiError(HTTP_STATUS.FORBIDDEN, "Access denied.");
}

export const getBookingTimeline = asyncHandler(async (req, res) => {
  await assertBookingAccess(req, req.params.bookingId);

  const timeline = await bookingEventService.getTimeline(
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Booking timeline fetched successfully.",
      {
        bookingId: req.params.bookingId,
        timeline,
      }
    )
  );
});

export const getBookingHistory = asyncHandler(async (req, res) => {
  await assertBookingAccess(req, req.params.bookingId);

  const history = await bookingEventService.getHistory(
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Booking history fetched successfully.",
      history
    )
  );
});

export const getBookingAuditLogs = asyncHandler(async (req, res) => {
  await assertBookingAccess(req, req.params.bookingId);

  const result = await auditRepository.findByResource(
    "Booking",
    req.params.bookingId,
    {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20,
    }
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Booking audit logs fetched successfully.",
      result
    )
  );
});
