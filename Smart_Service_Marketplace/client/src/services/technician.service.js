import * as technicianApi from "../api/technician.api";

const unwrap = (response) => response.data?.data ?? response.data;

export const browseTechnicians = async (params) =>
  unwrap(await technicianApi.browseTechnicians(params));

export const getDashboard = async () =>
  unwrap(await technicianApi.getDashboard());

export const getProfile = async () => unwrap(await technicianApi.getProfile());

export const updateProfile = async (data) =>
  unwrap(await technicianApi.updateProfile(data));

export const uploadPhoto = async (file) => {
  const formData = new FormData();
  formData.append("profilePhoto", file);
  return unwrap(await technicianApi.uploadPhoto(formData));
};

export const deletePhoto = async () =>
  unwrap(await technicianApi.deletePhoto());

export const uploadIdentityProof = async (file) => {
  const formData = new FormData();
  formData.append("identityProof", file);
  return unwrap(await technicianApi.uploadIdentityProof(formData));
};

export const uploadCertification = async ({ file, name, issuedBy }) => {
  const formData = new FormData();
  formData.append("document", file);
  formData.append("name", name);
  if (issuedBy) formData.append("issuedBy", issuedBy);
  return unwrap(await technicianApi.uploadCertification(formData));
};

export const deleteCertification = async (certificationId) =>
  unwrap(await technicianApi.deleteCertification(certificationId));

export const updateServiceCategories = async (serviceCategories) =>
  unwrap(await technicianApi.updateServiceCategories(serviceCategories));

export const updateServiceAreas = async (serviceAreas) =>
  unwrap(await technicianApi.updateServiceAreas(serviceAreas));

export const getAvailability = async () =>
  unwrap(await technicianApi.getAvailability());

export const setOnlineStatus = async (onlineStatus) =>
  unwrap(await technicianApi.setOnlineStatus(onlineStatus));

export const setVacationMode = async (data) =>
  unwrap(await technicianApi.setVacationMode(data));

export const updateAvailability = async (availabilityStatus) =>
  unwrap(await technicianApi.updateAvailability(availabilityStatus));

export const updateWorkingHours = async (workingHours) =>
  unwrap(await technicianApi.updateWorkingHours(workingHours));

export const completeSetup = async (data) =>
  unwrap(await technicianApi.completeSetup(data));

export const changePassword = async (data) =>
  unwrap(await technicianApi.changePassword(data));
