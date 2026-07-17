import adminService from "../services/admin.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await adminService.login(email, password, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Admin login successful.", result)
  );
});

export const getAdminProfile = asyncHandler(async (req, res) => {
  const result = await adminService.getProfile(req.user._id);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Admin profile fetched.", result)
  );
});

export const updateAdminProfile = asyncHandler(async (req, res) => {
  const result = await adminService.updateProfile(req.user._id, req.body);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Admin profile updated.", result)
  );
});

export const changeAdminPassword = asyncHandler(async (req, res) => {
  const result = await adminService.changePassword(req.user._id, req.body);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, {
      token: result.token,
    })
  );
});

export const adminLogout = asyncHandler(async (req, res) => {
  const result = await adminService.logout();

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message)
  );
});

export const adminLogoutAllDevices = asyncHandler(async (req, res) => {
  const result = await adminService.logoutAllDevices(req.user._id);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, {
      tokenVersion: result.tokenVersion,
    })
  );
});

export const getAdminSessions = asyncHandler(async (req, res) => {
  const result = await adminService.getSessions(req.user._id);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Admin sessions fetched.", result)
  );
});
