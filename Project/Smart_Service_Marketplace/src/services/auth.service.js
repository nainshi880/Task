import * as authApi from "../api/auth.api";

export const register = async (data) => {
  const response = await authApi.registerUser(data);
  return response.data;
};

export const login = async (data) => {
  const response = await authApi.loginUser(data);
  return response.data;
};

export const logout = async () => {
  const response = await authApi.logoutUser();
  return response.data;
};

export const me = async () => {
  const response = await authApi.getCurrentUser();
  return response.data;
};

export const forgot = async (email) => {
  const response = await authApi.forgotPassword(email);
  return response.data;
};

export const reset = async (token, data) => {
  const response = await authApi.resetPassword(token, data);
  return response.data;
};

export const verify = async (token) => {
  const response = await authApi.verifyEmail(token);
  return response.data;
};