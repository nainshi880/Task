import technicianJobsService from "../services/technicianJobs.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

const getActorMeta = (req) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent"),
});

export const listTechnicianJobs = asyncHandler(async (req, res) => {
  const result = await technicianJobsService.listJobs(
    req.user._id,
    req.query,
    getActorMeta(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Jobs fetched successfully.",
      result
    )
  );
});

export const searchTechnicianJobs = asyncHandler(async (req, res) => {
  const result = await technicianJobsService.searchJobs(
    req.user._id,
    req.query,
    getActorMeta(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Jobs searched successfully.",
      result
    )
  );
});

export const filterTechnicianJobs = asyncHandler(async (req, res) => {
  const result = await technicianJobsService.filterJobs(
    req.user._id,
    req.query,
    getActorMeta(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Jobs filtered successfully.",
      result
    )
  );
});

export const getTechnicianActivity = asyncHandler(async (req, res) => {
  const result = await technicianJobsService.getActivityHistory(
    req.user._id,
    req.query
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Activity history fetched successfully.",
      result
    )
  );
});

export const getTechnicianAuditLogs = asyncHandler(async (req, res) => {
  const result = await technicianJobsService.getAuditLogs(
    req.user._id,
    req.query
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Audit logs fetched successfully.",
      result
    )
  );
});

export const getTechnicianPerformanceReport = asyncHandler(
  async (req, res) => {
    const result = await technicianJobsService.getPerformanceReport(
      req.user._id,
      req.query
    );

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        HTTP_STATUS.OK,
        "Performance report fetched successfully.",
        result
      )
    );
  }
);
