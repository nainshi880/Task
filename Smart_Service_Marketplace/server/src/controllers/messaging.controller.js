import otpService from "../services/otp.service.js";
import emailService from "../services/email.service.js";
import smsService from "../services/sms.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const sendOtp = asyncHandler(async (req, res) => {
  const result = await otpService.sendOtp({
    phone: req.body.phone,
    purpose: req.body.purpose || "general",
    userId: req.user?._id || null,
  });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      result.sent ? "OTP sent successfully." : "OTP created (SMS not configured).",
      result
    )
  );
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const result = await otpService.verifyOtp({
    phone: req.body.phone,
    code: req.body.code,
    purpose: req.body.purpose || "general",
  });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "OTP verified successfully.", result)
  );
});

export const getMessagingProviders = asyncHandler(async (_req, res) => {
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Messaging providers status.", {
      email: emailService.isConfigured(),
      sms: smsService.getProviderStatus(),
    })
  );
});
