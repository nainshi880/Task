import adminUserService from "../services/adminUser.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

function actorContext(req) {
  return {
    userId: req.user._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

export const listAdminUsers = asyncHandler(async (req, res) => {
  const result = await adminUserService.listCustomers(req.query, actorContext(req));

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Customers fetched successfully.", result)
  );
});

export const searchAdminUsers = asyncHandler(async (req, res) => {
  const result = await adminUserService.searchCustomers(req.query, actorContext(req));

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Customer search results.", result)
  );
});

export const filterAdminUsers = asyncHandler(async (req, res) => {
  const result = await adminUserService.filterCustomers(req.query, actorContext(req));

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Filtered customers fetched.", result)
  );
});

export const getAdminUserDetails = asyncHandler(async (req, res) => {
  const result = await adminUserService.getUserDetails(
    req.params.userId,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "User details fetched.", result)
  );
});

export const blockAdminUser = asyncHandler(async (req, res) => {
  const result = await adminUserService.blockUser(
    req.params.userId,
    req.user._id,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, { user: result.user })
  );
});

export const unblockAdminUser = asyncHandler(async (req, res) => {
  const result = await adminUserService.unblockUser(
    req.params.userId,
    req.user._id,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, { user: result.user })
  );
});

export const deleteAdminUser = asyncHandler(async (req, res) => {
  const result = await adminUserService.deleteUser(
    req.params.userId,
    req.user._id,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, { user: result.user })
  );
});

export const getAdminUserActivity = asyncHandler(async (req, res) => {
  const result = await adminUserService.getUserActivity(
    req.params.userId,
    req.query,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "User activity logs fetched.", result)
  );
});
