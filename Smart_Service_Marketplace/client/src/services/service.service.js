import * as serviceApi from "../api/service.api";

const unwrap = (response) => response.data?.data ?? response.data;

export const listServices = async (params) =>
  unwrap(await serviceApi.listServices(params));

export const getPopularServices = async (params) =>
  unwrap(await serviceApi.getPopularServices(params));

export const getCategories = async () =>
  unwrap(await serviceApi.getServiceCategories());

export const getServiceById = async (serviceId) =>
  unwrap(await serviceApi.getServiceById(serviceId));
