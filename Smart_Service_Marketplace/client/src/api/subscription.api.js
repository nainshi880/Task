import api from "./axios";

export const listPlans = () => api.get("/technicians/subscriptions/plans");

export const getCurrent = () => api.get("/technicians/subscriptions/current");

export const createPro = (data = {}) =>
  api.post("/technicians/subscriptions", data);

export const verify = (data) => api.post("/technicians/subscriptions/verify", data);

export const cancel = (data) => api.post("/technicians/subscriptions/cancel", data);
