import technicianAvailabilityEarningsService from "../services/technicianAvailabilityEarnings.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const getAvailabilitySettings = asyncHandler(async (req, res) => {
  const settings =
    await technicianAvailabilityEarningsService.getAvailabilitySettings(
      req.user._id
    );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Availability settings fetched successfully.",
      settings
    )
  );
});

export const setOnlineStatus = asyncHandler(async (req, res) => {
  const result =
    await technicianAvailabilityEarningsService.setOnlineStatus(
      req.user._id,
      req.body.onlineStatus
    );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      result.onlineStatus
        ? "You are now online."
        : "You are now offline.",
      result
    )
  );
});

export const setVacationMode = asyncHandler(async (req, res) => {
  const result =
    await technicianAvailabilityEarningsService.setVacationMode(
      req.user._id,
      req.body
    );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      result.vacationMode
        ? "Vacation mode enabled."
        : "Vacation mode disabled.",
      result
    )
  );
});

export const updateServiceAreas = asyncHandler(async (req, res) => {
  const result =
    await technicianAvailabilityEarningsService.updateServiceAreas(
      req.user._id,
      req.body.serviceAreas
    );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Service areas updated successfully.",
      result
    )
  );
});

