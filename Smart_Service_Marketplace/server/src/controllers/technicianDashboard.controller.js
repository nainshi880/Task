import technicianDashboardService from "../services/technicianDashboard.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const getTechnicianDashboard = asyncHandler(async (req, res) => {
  const dashboard = await technicianDashboardService.getDashboard(
    req.user._id
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Technician dashboard fetched successfully.",
      dashboard
    )
  );
});
