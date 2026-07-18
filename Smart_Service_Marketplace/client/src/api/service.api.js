import api from "./axios";

/** Drop empty / null query params so the API doesn't reject blank filters. */
function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined
    )
  );
}

export const listServices = (params) =>
  api.get("/services", { params: cleanParams(params) });

export const getPopularServices = (params) =>
  api.get("/services/popular", { params: cleanParams(params) });

export const getServiceCategories = () => api.get("/services/categories");

export const getServiceById = (serviceId) =>
  api.get(`/services/${serviceId}`);
