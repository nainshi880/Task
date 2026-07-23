import api from "./axios";

export const submitReview = (data) => api.post("/reviews", data);

export const getTechnicianReviews = (technicianId, params) =>
  api.get(`/reviews/${technicianId}`, { params });

export const getBookingReview = (bookingId) =>
  api.get(`/reviews/booking/${bookingId}`);

export const reportReview = (reviewId, data) =>
  api.post(`/reviews/${reviewId}/report`, data);
