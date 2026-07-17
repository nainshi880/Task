import batchService from "../services/batch.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const executeBatch = asyncHandler(async (req, res) => {
  const result = await batchService.execute(req.user, req.body);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Batch requests processed.", result)
  );
});
