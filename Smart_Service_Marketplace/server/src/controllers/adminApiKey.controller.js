import apiKeyService from "../services/apiKey.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const createApiKey = asyncHandler(async (req, res) => {
  const result = await apiKeyService.createKey(req.user._id, req.body);

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, result.message, {
      apiKey: result.apiKey,
      key: result.plainKey,
    })
  );
});

export const listApiKeys = asyncHandler(async (req, res) => {
  const keys = await apiKeyService.listKeys(req.user._id);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "API keys fetched.", { keys })
  );
});

export const revokeApiKey = asyncHandler(async (req, res) => {
  const key = await apiKeyService.revokeKey(req.user._id, req.params.keyId);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "API key revoked.", { key })
  );
});
