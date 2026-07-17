import api from "./axios";

export const listJobs = (params) =>
  api.get("/technicians/jobs", { params });

export const getJobById = (bookingId) =>
  api.get(`/technicians/jobs/${bookingId}`);

export const acceptJob = (bookingId) =>
  api.patch(`/technicians/jobs/${bookingId}/accept`);

export const rejectJob = (bookingId, data) =>
  api.patch(`/technicians/jobs/${bookingId}/reject`, data);

export const markArriving = (bookingId) =>
  api.patch(`/bookings/${bookingId}/arriving`);

export const startJob = (bookingId) =>
  api.patch(`/technicians/jobs/${bookingId}/start`);

export const pauseJob = (bookingId, data) =>
  api.patch(`/technicians/jobs/${bookingId}/pause`, data);

export const resumeJob = (bookingId) =>
  api.patch(`/technicians/jobs/${bookingId}/resume`);

export const addWorkNote = (bookingId, data) =>
  api.post(`/technicians/jobs/${bookingId}/work-notes`, data);

export const uploadCompletionImages = (bookingId, formData) =>
  api.post(`/technicians/jobs/${bookingId}/completion-images`, formData);

export const completeJob = (bookingId, data) =>
  api.patch(`/technicians/jobs/${bookingId}/complete`, data);
