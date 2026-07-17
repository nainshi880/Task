import dashboardStatisticsService from "../services/dashboardStatistics.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const getCustomerDashboardStatistics = asyncHandler(async (req, res) => {
  const result = await dashboardStatisticsService.getCustomerStatistics(
    req.user._id
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Customer dashboard statistics fetched successfully.",
      result
    )
  );
});

export const getTechnicianDashboardStatistics = asyncHandler(async (req, res) => {
  const result = await dashboardStatisticsService.getTechnicianStatistics(
    req.user._id
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Technician dashboard statistics fetched successfully.",
      result
    )
  );
});

export const getAdminDashboardStatistics = asyncHandler(async (req, res) => {
  const result = await dashboardStatisticsService.getAdminStatistics(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Admin dashboard statistics fetched successfully.",
      result
    )
  );
});
