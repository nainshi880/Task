/**
 * Auth API — connected to backend `/api/v1/auth/*`
 *
 * - POST /auth/register
 * - POST /auth/login
 * - POST /auth/logout
 * - GET  /auth/me
 * - POST /auth/forgot-password
 * - PUT  /auth/reset-password/:token
 * - POST /auth/verify-email           (authenticated resend OTP)
 * - POST /auth/verify-email/resend    (resend OTP by email)
 * - POST /auth/verify-email/verify    (verify OTP)
 */
import api from "./axios";

export const registerUser = (data) => api.post("/auth/register", data);

export const registerTechnician = (formData) =>
  api.post("/auth/register/technician", formData);

export const loginUser = (data) => api.post("/auth/login", data);

export const logoutUser = () => api.post("/auth/logout");

export const getCurrentUser = () => api.get("/auth/me");

export const forgotPassword = (email) =>
  api.post("/auth/forgot-password", { email });

export const verifyForgotPasswordOtp = (data) =>
  api.post("/auth/forgot-password/verify-otp", data);

export const resetPassword = (token, data) =>
  api.put(`/auth/reset-password/${token}`, data);

export const verifyEmailOtp = (data) =>
  api.post("/auth/verify-email/verify", data);

export const sendVerificationEmail = () =>
  api.post("/auth/verify-email");

export const resendVerificationEmail = (email) =>
  api.post("/auth/verify-email/resend", { email });

export const refreshToken = () => api.post("/auth/refresh");

export const updateDeviceToken = (deviceToken) =>
  api.put("/auth/device-token", { deviceToken });
