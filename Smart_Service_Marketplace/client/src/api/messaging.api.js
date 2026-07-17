import api from "./axios";

export const sendOtp = (data) => api.post("/messaging/otp/send", data);

export const verifyOtp = (data) => api.post("/messaging/otp/verify", data);

export const sendAuthOtp = (data) => api.post("/messaging/otp/send-auth", data);
