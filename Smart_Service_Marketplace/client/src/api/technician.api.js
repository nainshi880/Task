import api from "./axios";

export const browseTechnicians = (params) =>
  api.get("/technicians/browse", { params });

export const getDashboard = () => api.get("/technicians/dashboard");

export const getProfile = () => api.get("/technicians/profile");

export const updateProfile = (data) => api.put("/technicians/profile", data);

export const uploadPhoto = (formData) =>
  api.patch("/technicians/profile/photo", formData);

export const deletePhoto = () => api.delete("/technicians/profile/photo");

export const uploadIdentityProof = (formData) =>
  api.patch("/technicians/profile/identity-proof", formData);

export const uploadCertification = (formData) =>
  api.post("/technicians/profile/certifications/upload", formData);

export const deleteCertification = (certificationId) =>
  api.delete(`/technicians/profile/certifications/${certificationId}`);

export const updateServiceCategories = (serviceCategories) =>
  api.put("/technicians/profile/service-categories", { serviceCategories });

export const updateServiceAreas = (serviceAreas) =>
  api.put("/technicians/availability/service-areas", { serviceAreas });

export const getAvailability = () => api.get("/technicians/availability");

export const setOnlineStatus = (onlineStatus) =>
  api.patch("/technicians/availability/online", { onlineStatus });

export const setVacationMode = (data) =>
  api.patch("/technicians/availability/vacation", data);

export const updateAvailability = (availabilityStatus) =>
  api.patch("/technicians/profile/availability", { availabilityStatus });

export const updateWorkingHours = (workingHours) =>
  api.put("/technicians/profile/working-hours", { workingHours });

export const completeSetup = (data) =>
  api.post("/technicians/profile/complete-setup", data);

export const changePassword = (data) =>
  api.put("/technicians/change-password", data);

export const getEarningsSummary = () =>
  api.get("/technicians/earnings/summary");

export const getMonthlyEarnings = (params) =>
  api.get("/technicians/earnings/monthly", { params });

export const getPayouts = (params) =>
  api.get("/technicians/earnings/payouts", { params });

export const requestPayout = (data) =>
  api.post("/technicians/earnings/payouts", data);
