import reviewService from "../services/review.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const submitReview = asyncHandler(async (req, res) => {
  const review = await reviewService.submitReview(req.user._id, req.body);

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, "Review submitted successfully.", {
      review,
    })
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
    new ApiResponse(HTTP_STATUS.OK, "Review fetched successfully.", {
      review,
    })
  );
});
