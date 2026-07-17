import api from "./axios";

export const getWallet = () => api.get("/wallet");

export const getWalletBalance = () => api.get("/wallet/balance");

export const getWalletTransactions = (params) =>
  api.get("/wallet/transactions", { params });
