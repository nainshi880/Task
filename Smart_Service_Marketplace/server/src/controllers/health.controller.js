import healthService from "../services/health.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const getHealth = asyncHandler(async (_req, res) => {
  const health = await healthService.getHealth();
  const statusCode =
    health.status === "healthy"
      ? HTTP_STATUS.OK
      : HTTP_STATUS.SERVICE_UNAVAILABLE;

  res.status(statusCode).json(
    new ApiResponse(statusCode, "Health check completed.", health)
  );
});

export const getReadiness = asyncHandler(async (_req, res) => {
  const readiness = await healthService.getReadiness();
  const statusCode =
    readiness.status === "ready"
      ? HTTP_STATUS.OK
      : HTTP_STATUS.SERVICE_UNAVAILABLE;

  res.status(statusCode).json(
    new ApiResponse(statusCode, "Readiness check completed.", readiness)
  );
});

export const getMetrics = asyncHandler(async (_req, res) => {
  const metrics = healthService.getMetrics();

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Metrics fetched successfully.", metrics)
  );
});
