import authService from "../services/auth.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import { setAuthCookies, clearAuthCookies } from "../utils/cookies.js";
import { COOKIE_NAMES } from "../constants/security.js";

function sessionMeta(req) {
  return {
    ipAddress: req.ip,
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

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, sessionMeta(req));

  setAuthCookies(res, { refreshToken: result.refreshToken });

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, "User registered successfully.", {
      user: result.user,
      token: result.token,
      accessToken: result.accessToken,
    })
  );
});

export const registerTechnician = asyncHandler(async (req, res) => {
  const result = await authService.registerTechnician(
    req.body,
    req.files || {},
    sessionMeta(req)
  );

  setAuthCookies(res, { refreshToken: result.refreshToken });

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Technician application submitted successfully. Awaiting admin approval.",
      {
        user: result.user,
        profile: result.profile,
        token: result.token,
        accessToken: result.accessToken,
      }
    )
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login(email, password, sessionMeta(req));

  setAuthCookies(res, { refreshToken: result.refreshToken });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Login successful.", {
      user: result.user,
      token: result.token,
      accessToken: result.accessToken,
    })
  );
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshToken(req);

  const result = await authService.refresh(refreshToken, sessionMeta(req));

  setAuthCookies(res, { refreshToken: result.refreshToken });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Token refreshed successfully.", {
      user: result.user,
      token: result.token,
      accessToken: result.accessToken,
    })
  );
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, result)
  );
});

export const verifyForgotPasswordOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyForgotPasswordOtp(
    req.body.email,
    req.body.code
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, result)
  );
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(getRefreshToken(req));
  clearAuthCookies(res);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Logout successful.")
  );
});

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user._id);
  clearAuthCookies(res);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Logged out from all devices successfully.")
  );
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user._id);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Current user fetched successfully.", user)
  );
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const result = await authService.resetPassword(token, password);

  setAuthCookies(res, { refreshToken: result.refreshToken });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Password reset successfully.", {
      user: result.user,
      token: result.token,
      accessToken: result.accessToken,
    })
  );
});

export const sendVerificationEmail = asyncHandler(async (req, res) => {
  const result = await authService.sendVerificationEmail(req.user._id);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, result)
  );
});

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const result = await authService.resendVerificationByEmail(req.body.email);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, result)
  );
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.params.token);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, result.message, result)
  );
});
