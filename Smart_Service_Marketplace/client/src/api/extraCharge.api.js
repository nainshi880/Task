import api from "./axios";

export const listExtraCharges = (bookingId) =>
  api.get(`/bookings/${bookingId}/extra-charges`);

export const createExtraCharge = (bookingId, formData) =>
  api.post(`/technicians/jobs/${bookingId}/extra-charges`, formData);

export const acceptExtraCharge = (extraChargeId) =>
  api.post(`/extra-charges/${extraChargeId}/accept`);

export const rejectExtraCharge = (extraChargeId, data) =>
  api.post(`/extra-charges/${extraChargeId}/reject`, data);

export const createExtraChargeOrder = (extraChargeId) =>
  api.post(`/payments/extra-charges/${extraChargeId}/orders`);
