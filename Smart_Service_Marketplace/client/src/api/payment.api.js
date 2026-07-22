import api from "./axios";

export const createOrder = (data) => api.post("/payments/orders", data);

export const verifyPayment = (data) => api.post("/payments/verify", data);

export const reportPaymentFailure = (data) =>
  api.post("/payments/failure", data);

export const getPaymentByBooking = (bookingId) =>
  api.get(`/payments/booking/${bookingId}`);
