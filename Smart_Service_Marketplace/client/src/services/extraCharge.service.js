import * as extraChargeApi from "../api/extraCharge.api";

const unwrap = (response) => response.data?.data ?? response.data;

export const listExtraCharges = async (bookingId) => {
  const data = unwrap(await extraChargeApi.listExtraCharges(bookingId));
  return data?.items || data || [];
};

export const createExtraCharge = async (bookingId, { description, amount, files }) => {
  const formData = new FormData();
  formData.append("description", description);
  formData.append("amount", String(amount));
  (files || []).forEach((file) => formData.append("issueImages", file));
  return unwrap(await extraChargeApi.createExtraCharge(bookingId, formData));
};

export const acceptExtraCharge = async (extraChargeId) =>
  unwrap(await extraChargeApi.acceptExtraCharge(extraChargeId));

export const rejectExtraCharge = async (extraChargeId, data = {}) =>
  unwrap(await extraChargeApi.rejectExtraCharge(extraChargeId, data));

export const createExtraChargeOrder = async (extraChargeId) =>
  unwrap(await extraChargeApi.createExtraChargeOrder(extraChargeId));
