import adminService from "../services/admin.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import { setAuthCookies, clearAuthCookies } from "../utils/cookies.js";
import { COOKIE_NAMES } from "../constants/security.js";

function sessionMeta(req) {
  return {
    ip: req.ip,
    userAgent: req.get("user-agent"),
  };
}

function getRefreshToken(req) {
  return (
    req.cookies?.[COOKIE_NAMES.REFRESH] ||
    req.body?.refreshToken ||
    null
  );
}

export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await adminService.login(email, password, sessionMeta(req));

  setAuthCookies(res, { refreshToken: result.refreshToken });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Admin login successful.", {
      user: result.user,
      profile: result.profile,
      token: result.token,
      accessToken: result.accessToken,
    })
  );
});

export const adminRefresh = asyncHandler(async (req, res) => {
  const result = await adminService.refresh(
    getRefreshToken(req),
    sessionMeta(req)
  );

  setAuthCookies(res, { refreshToken: result.refreshToken });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Admin token refreshed.", {
      user: result.user,
      profile: result.profile,
      token: result.token,
      accessToken: result.accessToken,
    })
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

  setAuthCookies(res, { refreshToken: result.refreshToken });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, {
      token: result.token,
      accessToken: result.accessToken,
    })
  );
});

export const adminLogout = asyncHandler(async (req, res) => {
  await adminService.logout(getRefreshToken(req));
  clearAuthCookies(res);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Logout successful.")
  );
});

export const adminLogoutAllDevices = asyncHandler(async (req, res) => {
  const result = await adminService.logoutAllDevices(req.user._id);
  clearAuthCookies(res);

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

export const createAdminAccount = asyncHandler(async (req, res) => {
  const result = await adminService.createAdmin(req.user._id, req.body);

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Admin account created successfully.",
      result
    )
  );
});

export const listAdminAccounts = asyncHandler(async (req, res) => {
  const admins = await adminService.listAdmins(req.user._id);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Admin accounts fetched.", { admins })
  );
});
