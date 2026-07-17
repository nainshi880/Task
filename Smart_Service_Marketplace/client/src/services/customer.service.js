import * as customerApi from "../api/customer.api";

const unwrap = (response) => response.data?.data ?? response.data;

export const createProfile = async (data) =>
  unwrap(await customerApi.createProfile(data));

export const getProfile = async () => unwrap(await customerApi.getProfile());

export const updateProfile = async (data) =>
  unwrap(await customerApi.updateProfile(data));

export const deleteAvatar = async () => unwrap(await customerApi.deleteAvatar());

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append("avatar", file);
  return unwrap(await customerApi.uploadAvatar(formData));
};

export const addAddress = async (data) =>
  unwrap(await customerApi.addAddress(data));

export const getAddresses = async () => unwrap(await customerApi.getAddresses());

export const updateAddress = async (addressId, data) =>
  unwrap(await customerApi.updateAddress(addressId, data));

export const deleteAddress = async (addressId) =>
  unwrap(await customerApi.deleteAddress(addressId));

export const changePassword = async (data) =>
  unwrap(await customerApi.changePassword(data));

export const getDashboard = async () => unwrap(await customerApi.getDashboard());

export const getStatistics = async () => unwrap(await customerApi.getStatistics());

export const getRecentBookings = async () =>
  unwrap(await customerApi.getRecentBookings());

export const getUpcomingBookings = async () =>
  unwrap(await customerApi.getUpcomingBookings());

export const getNotifications = async () =>
  unwrap(await customerApi.getNotifications());

export const ensureProfile = async (data) => {
  try {
    return await getProfile();
  } catch (error) {
    if (error.response?.status === 404) {
      return createProfile(data);
    }
    throw error;
  }
};
