import * as bookingApi from "../api/booking.api";

const unwrap = (response) => response.data?.data ?? response.data;

export const createBooking = async (data) =>
  unwrap(await bookingApi.createBooking(data));

export const getBookingById = async (bookingId) =>
  unwrap(await bookingApi.getBookingById(bookingId));

export const getCustomerBookings = async (params) =>
  unwrap(await bookingApi.getCustomerBookings(params));

export const updateBooking = async (bookingId, data) =>
  unwrap(await bookingApi.updateBooking(bookingId, data));

export const cancelBooking = async (bookingId, data) =>
  unwrap(await bookingApi.cancelBooking(bookingId, data));

export const getBookingTimeline = async (bookingId) =>
  unwrap(await bookingApi.getBookingTimeline(bookingId));

export const confirmCompletion = async (bookingId) =>
  unwrap(await bookingApi.confirmCompletion(bookingId));
