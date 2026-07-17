import * as jobsApi from "../api/technicianJobs.api";

const unwrap = (response) => response.data?.data ?? response.data;

export const listJobs = async (params) =>
  unwrap(await jobsApi.listJobs(params));

export const getJobById = async (bookingId) =>
  unwrap(await jobsApi.getJobById(bookingId));

export const acceptJob = async (bookingId) =>
  unwrap(await jobsApi.acceptJob(bookingId));

export const rejectJob = async (bookingId, data) =>
  unwrap(await jobsApi.rejectJob(bookingId, data));

export const markArriving = async (bookingId) =>
  unwrap(await jobsApi.markArriving(bookingId));

export const startJob = async (bookingId) =>
  unwrap(await jobsApi.startJob(bookingId));

export const pauseJob = async (bookingId, data) =>
  unwrap(await jobsApi.pauseJob(bookingId, data));

export const resumeJob = async (bookingId) =>
  unwrap(await jobsApi.resumeJob(bookingId));

export const addWorkNote = async (bookingId, data) =>
  unwrap(await jobsApi.addWorkNote(bookingId, data));

export const uploadCompletionImages = async (bookingId, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("issueImages", file));
  return unwrap(await jobsApi.uploadCompletionImages(bookingId, formData));
};

export const completeJob = async (bookingId, data) =>
  unwrap(await jobsApi.completeJob(bookingId, data));
