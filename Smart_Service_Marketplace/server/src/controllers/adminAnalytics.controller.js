import adminAnalyticsService from "../services/adminAnalytics.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const getAdminDashboardMetrics = asyncHandler(async (req, res) => {
  const result = await adminAnalyticsService.getDashboardMetrics(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Dashboard metrics fetched successfully.",
      result
    )
  );
});

export const getAdminGrowthCharts = asyncHandler(async (req, res) => {
  const result = await adminAnalyticsService.getGrowthCharts(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Growth charts fetched successfully.",
      result
    )
  );
});

export const getAdminMonthlyReports = asyncHandler(async (req, res) => {
  const result = await adminAnalyticsService.getMonthlyReports(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Monthly reports fetched successfully.",
      result
    )
  );
});
