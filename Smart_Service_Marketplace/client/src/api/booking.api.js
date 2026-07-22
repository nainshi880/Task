import api from "./axios";

export const createBooking = (data) => api.post("/bookings", data);

export const getBookingById = (bookingId) => api.get(`/bookings/${bookingId}`);

export const getCustomerBookings = (params) =>
  api.get("/bookings", { params });

export const updateBooking = (bookingId, data) =>
  api.put(`/bookings/${bookingId}`, data);

export const cancelBooking = (bookingId, data) =>
  api.patch(`/bookings/${bookingId}/cancel`, data);

export const getBookingTimeline = (bookingId) =>
  api.get(`/bookings/${bookingId}/timeline`);

export const confirmCompletion = (bookingId) =>
  api.patch(`/bookings/${bookingId}/confirm-completion`);
