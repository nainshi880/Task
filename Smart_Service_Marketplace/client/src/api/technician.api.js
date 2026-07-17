import api from "./axios";

export const browseTechnicians = (params) =>
  api.get("/technicians/browse", { params });

export const getProfile = () => api.get("/technicians/profile");

export const updateProfile = (data) => api.put("/technicians/profile", data);

export const uploadPhoto = (formData) =>
  api.patch("/technicians/profile/photo", formData);

export const uploadIdentityProof = (formData) =>
  api.patch("/technicians/profile/identity-proof", formData);

export const uploadCertification = (formData) =>
  api.post("/technicians/profile/certifications/upload", formData);

export const updateServiceCategories = (serviceCategories) =>
  api.put("/technicians/profile/service-categories", { serviceCategories });

export const updateServiceAreas = (serviceAreas) =>
  api.put("/technicians/availability/service-areas", { serviceAreas });

export const updateAvailability = (availabilityStatus) =>
  api.patch("/technicians/profile/availability", { availabilityStatus });

export const updateWorkingHours = (workingHours) =>
  api.put("/technicians/profile/working-hours", { workingHours });

export const completeSetup = (data) =>
  api.post("/technicians/profile/complete-setup", data);
