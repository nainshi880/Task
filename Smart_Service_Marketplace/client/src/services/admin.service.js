import * as adminApi from "../api/admin.api";

const unwrap = (response) => response.data?.data ?? response.data;

export const login = async (data) => unwrap(await adminApi.adminLogin(data));

export const logout = async () => unwrap(await adminApi.adminLogout());

export const getProfile = async () => unwrap(await adminApi.getAdminProfile());

export const listAdmins = async () => unwrap(await adminApi.listAdmins());

export const createAdmin = async (data) =>
  unwrap(await adminApi.createAdmin(data));
