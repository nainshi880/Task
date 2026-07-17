import adminReviewService from "../services/adminReview.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

function actorContext(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

export const listAdminReviews = asyncHandler(async (req, res) => {
  const result = await adminReviewService.listReviews(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Reviews fetched successfully.", result)
  );
});

export const listAdminReportedReviews = asyncHandler(async (req, res) => {
  const result = await adminReviewService.listReportedReviews(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Reported reviews fetched successfully.",
      result
    )
  );
});

export const getAdminReviewDetails = asyncHandler(async (req, res) => {
  const review = await adminReviewService.getReviewDetails(req.params.reviewId);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Review details fetched.", { review })
  );
});

export const approveAdminReview = asyncHandler(async (req, res) => {
  const result = await adminReviewService.approveReview(
    req.params.reviewId,
    req.user._id,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, result)
  );
});

export const rejectAdminReview = asyncHandler(async (req, res) => {
  const result = await adminReviewService.rejectReview(
    req.params.reviewId,
    req.user._id,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, result)
  );
});

export const deleteAdminReview = asyncHandler(async (req, res) => {
  const result = await adminReviewService.deleteReview(
    req.params.reviewId,
    req.user._id,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, result)
  );
});

export const resolveAdminReviewReport = asyncHandler(async (req, res) => {
  const result = await adminReviewService.resolveReport(
    req.params.reviewId,
    req.params.reportId,
    req.user._id,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, result)
  );
});

export const getAdminRatingAnalytics = asyncHandler(async (req, res) => {
  const analytics = await adminReviewService.getRatingAnalytics(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Rating analytics fetched.", analytics)
  );
});
