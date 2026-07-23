import reviewService from "../services/review.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const submitReview = asyncHandler(async (req, res) => {
  const result = await reviewService.submitReview(req.user._id, req.body);

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, "Review submitted successfully.", result)
  );
});

export const getTechnicianReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.getTechnicianReviews(
    req.params.technicianId,
    req.query
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Technician reviews fetched successfully.", result)
  );
});

export const getServiceReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.getServiceReviews(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Service reviews fetched successfully.", result)
  );
});

export const updateReview = asyncHandler(async (req, res) => {
  const review = await reviewService.updateReview(
    req.user._id,
    req.params.id,
    req.body
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Review updated successfully.", { review })
  );
});

export const deleteReview = asyncHandler(async (req, res) => {
  await reviewService.deleteReview(req.user._id, req.params.id);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Review deleted successfully.")
  );
});

export const reportReview = asyncHandler(async (req, res) => {
  const review = await reviewService.reportReview(
    req.user._id,
    req.params.reviewId,
    req.body
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Review reported successfully.", {
      review,
    })
  );
});

export const getBookingReview = asyncHandler(async (req, res) => {
  const review = await reviewService.getBookingReview(
    req.user._id,
    req.params.bookingId,
    req.user.role
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      review ? "Review fetched successfully." : "No review for this booking yet.",
      { review: review || null }
    )
  );
});
