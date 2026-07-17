import * as authApi from "../api/auth.api";
import * as messagingApi from "../api/messaging.api";

const unwrap = (response) => response.data?.data ?? response.data;

export const register = async (data) => unwrap(await authApi.registerUser(data));

export const registerTechnician = async (formData) =>
  unwrap(await authApi.registerTechnician(formData));

export const login = async (data) => unwrap(await authApi.loginUser(data));

export const logout = async () => unwrap(await authApi.logoutUser());

export const me = async () => unwrap(await authApi.getCurrentUser());

export const forgot = async (email) => unwrap(await authApi.forgotPassword(email));

export const verifyForgotOtp = async (data) =>
  unwrap(await authApi.verifyForgotPasswordOtp(data));

export const reset = async (token, data) =>
  unwrap(await authApi.resetPassword(token, data));

export const verify = async (token) => unwrap(await authApi.verifyEmail(token));

export const sendVerification = async () =>
  unwrap(await authApi.sendVerificationEmail());

export const resendVerification = async (email) =>
  unwrap(await authApi.resendVerificationEmail(email));

export const refresh = async () => unwrap(await authApi.refreshToken());

export const sendOtp = async (data) => unwrap(await messagingApi.sendOtp(data));

export const verifyOtpCode = async (data) =>
  unwrap(await messagingApi.verifyOtp(data));
