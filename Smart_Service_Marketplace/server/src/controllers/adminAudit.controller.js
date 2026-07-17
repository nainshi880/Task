import adminAuditService from "../services/adminAudit.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const listAdminAuditLogs = asyncHandler(async (req, res) => {
  const result = await adminAuditService.listAuditLogs(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Audit logs fetched successfully.",
      result
    )
  );
});
