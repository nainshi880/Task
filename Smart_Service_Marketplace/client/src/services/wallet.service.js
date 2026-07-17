import * as walletApi from "../api/wallet.api";

const unwrap = (response) => response.data?.data ?? response.data;

export const getWallet = async () => unwrap(await walletApi.getWallet());

export const getBalance = async () => unwrap(await walletApi.getWalletBalance());

export const getTransactions = async (params) =>
  unwrap(await walletApi.getWalletTransactions(params));
