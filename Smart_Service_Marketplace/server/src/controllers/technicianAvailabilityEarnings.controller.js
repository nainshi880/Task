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

export const getEarningsSummary = asyncHandler(async (req, res) => {
  const summary =
    await technicianAvailabilityEarningsService.getEarningsSummary(
      req.user._id
    );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Earnings summary fetched successfully.",
      summary
    )
  );
});

export const getMonthlyEarnings = asyncHandler(async (req, res) => {
  const earnings =
    await technicianAvailabilityEarningsService.getMonthlyEarnings(
      req.user._id,
      req.query
    );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Monthly earnings fetched successfully.",
      earnings
    )
  );
});

export const getPayoutHistory = asyncHandler(async (req, res) => {
  const history =
    await technicianAvailabilityEarningsService.getPayoutHistory(
      req.user._id,
      req.query
    );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Payout history fetched successfully.",
      history
    )
  );
});

export const requestPayout = asyncHandler(async (req, res) => {
  const payout =
    await technicianAvailabilityEarningsService.requestPayout(
      req.user._id,
      req.body
    );

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Payout requested successfully.",
      payout
    )
  );
});

export const listAdminPayouts = asyncHandler(async (req, res) => {
  const result =
    await technicianAvailabilityEarningsService.listAdminPayouts(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Payouts fetched successfully.",
      result
    )
  );
});

export const processPayout = asyncHandler(async (req, res) => {
  const payout =
    await technicianAvailabilityEarningsService.processPayout(
      req.user._id,
      req.params.payoutId,
      req.body,
      {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      }
    );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Payout processed successfully.",
      payout
    )
  );
});
