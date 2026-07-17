import api from "./axios";

export const listServices = (params) => api.get("/services", { params });

export const getPopularServices = (params) =>
  api.get("/services/popular", { params });

export const getServiceCategories = () => api.get("/services/categories");

export const getServiceById = (serviceId) =>
  api.get(`/services/${serviceId}`);
