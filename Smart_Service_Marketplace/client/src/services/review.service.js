import * as reviewApi from "../api/review.api";

const unwrap = (response) => response.data?.data ?? response.data;

export const submitReview = async (data) =>
  unwrap(await reviewApi.submitReview(data));

export const getTechnicianReviews = async (technicianId, params) =>
  unwrap(await reviewApi.getTechnicianReviews(technicianId, params));

export const getBookingReview = async (bookingId) =>
  unwrap(await reviewApi.getBookingReview(bookingId));

export const reportReview = async (reviewId, data) =>
  unwrap(await reviewApi.reportReview(reviewId, data));
