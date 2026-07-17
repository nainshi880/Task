import api from "./axios";

export const adminLogin = (data) => api.post("/admin/login", data);

export const adminLogout = () => api.post("/admin/logout");

export const getAdminProfile = () => api.get("/admin/profile");

export const listAdmins = () => api.get("/admin/admins");

export const createAdmin = (data) => api.post("/admin/admins", data);
