import * as authApi from "../api/auth.api";

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

export const verify = async (data) =>
  unwrap(await authApi.verifyEmailOtp(data));

export const sendVerification = async () =>
  unwrap(await authApi.sendVerificationEmail());

export const resendVerification = async (email) =>
  unwrap(await authApi.resendVerificationEmail(email));

export const refresh = async () => unwrap(await authApi.refreshToken());

export const updateDeviceToken = async (deviceToken) =>
  unwrap(await authApi.updateDeviceToken(deviceToken));
