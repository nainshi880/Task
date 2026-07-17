import api from "./axios";

export const createProfile = (data) => api.post("/customer/profile", data);

export const getProfile = () => api.get("/customer/profile");

export const updateProfile = (data) => api.put("/customer/profile", data);

export const deleteAvatar = () => api.delete("/customer/avatar");

export const uploadAvatar = (formData) =>
  api.patch("/customer/avatar", formData);

export const addAddress = (data) => api.post("/customer/addresses", data);

export const getAddresses = () => api.get("/customer/addresses");

export const updateAddress = (addressId, data) =>
  api.put(`/customer/addresses/${addressId}`, data);

export const deleteAddress = (addressId) =>
  api.delete(`/customer/addresses/${addressId}`);

export const setDefaultAddress = (addressId) =>
  api.patch(`/customer/addresses/${addressId}/default`);

export const changePassword = (data) =>
  api.put("/customer/change-password", data);

export const getDashboard = () => api.get("/customer/dashboard");

export const getStatistics = () => api.get("/customer/statistics");

export const getRecentBookings = () => api.get("/customer/recent-bookings");

export const getUpcomingBookings = () => api.get("/customer/upcoming-bookings");

export const getNotifications = () => api.get("/customer/notifications");
