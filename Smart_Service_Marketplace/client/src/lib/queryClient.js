import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export const authKeys = {
  all: ["auth"],
  me: () => [...authKeys.all, "me"],
};

export const customerKeys = {
  all: ["customer"],
  profile: () => [...customerKeys.all, "profile"],
  dashboard: () => [...customerKeys.all, "dashboard"],
  walletBalance: () => [...customerKeys.all, "wallet", "balance"],
};

export default queryClient;
