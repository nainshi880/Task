import bookingWorkflowService from "../services/bookingWorkflow.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

// ======================================
// Technician: My Bookings
// ======================================

export const getTechnicianBookings = asyncHandler(async (req, res) => {
  const result = await bookingWorkflowService.getTechnicianBookings(
    req.user._id,
    req.query
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Technician bookings fetched successfully.",
      result
    )
  );
});

// ======================================
// Accept Job
// ======================================

export const acceptJob = asyncHandler(async (req, res) => {
  const booking = await bookingWorkflowService.acceptJob(
    req.user._id,
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Job accepted successfully.",
      booking
    )
  );
});

export const markArriving = asyncHandler(async (req, res) => {
  const booking = await bookingWorkflowService.markArriving(
    req.user._id,
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Technician arriving notification sent.",
      booking
    )
  );
});

// ======================================
// Reject Job
// ======================================

export const rejectJob = asyncHandler(async (req, res) => {
  const booking = await bookingWorkflowService.rejectJob(
    req.user._id,
    req.params.bookingId,
    req.body.rejectionReason
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Job rejected successfully. Booking is pending reassignment.",
      booking
    )
  );
});

// ======================================
// Start Work
// ======================================

export const startWork = asyncHandler(async (req, res) => {
  const booking = await bookingWorkflowService.startWork(
    req.user._id,
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Work started successfully.",
      booking
    )
  );
});

export const pauseWork = asyncHandler(async (req, res) => {
  const booking = await bookingWorkflowService.pauseWork(
    req.user._id,
    req.params.bookingId,
    req.body.reason
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Work paused successfully.",
      booking
    )
  );
});

export const resumeWork = asyncHandler(async (req, res) => {
  const booking = await bookingWorkflowService.resumeWork(
    req.user._id,
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Work resumed successfully.",
      booking
    )
  );
});

export const addWorkNotes = asyncHandler(async (req, res) => {
  const booking = await bookingWorkflowService.addWorkNotes(
    req.user._id,
    req.params.bookingId,
    req.body.note
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Work note added successfully.",
      booking
    )
  );
});

export const getAssignedJobById = asyncHandler(async (req, res) => {
  const booking = await bookingWorkflowService.getAssignedJobById(
    req.user._id,
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Job fetched successfully.",
      booking
    )
  );
});

// ======================================
// Upload Completion Images
// ======================================

export const uploadCompletionImages = asyncHandler(async (req, res) => {
  const booking = await bookingWorkflowService.uploadCompletionImages(
    req.user._id,
    req.params.bookingId,
    req.files || []
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Completion images uploaded successfully.",
      booking
    )
  );
});

// ======================================
// Complete Work
// ======================================

export const completeWork = asyncHandler(async (req, res) => {
  const booking = await bookingWorkflowService.completeWork(
    req.user._id,
    req.params.bookingId,
    req.body.workNotes
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Work completed successfully.",
      booking
    )
  );
});

// ======================================
// Customer Confirms Completion
// ======================================

export const confirmCompletion = asyncHandler(async (req, res) => {
  const booking = await bookingWorkflowService.confirmCompletion(
    req.user._id,
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Booking completion confirmed successfully.",
      booking
    )
  );
});

// ======================================
// Close Booking
// ======================================

export const closeBooking = asyncHandler(async (req, res) => {
  const booking = await bookingWorkflowService.closeBooking(
    req.user._id,
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Booking closed successfully.",
      booking
    )
  );
});
