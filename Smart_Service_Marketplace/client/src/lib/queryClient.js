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
  addresses: () => [...customerKeys.all, "addresses"],
  dashboard: () => [...customerKeys.all, "dashboard"],
  walletBalance: () => [...customerKeys.all, "wallet", "balance"],
};

export const serviceKeys = {
  all: ["services"],
  list: (filters) => [...serviceKeys.all, "list", filters],
  popular: () => [...serviceKeys.all, "popular"],
  categories: () => [...serviceKeys.all, "categories"],
  detail: (id) => [...serviceKeys.all, "detail", id],
};

export const bookingKeys = {
  all: ["bookings"],
  list: (filters) => [...bookingKeys.all, "list", filters],
  detail: (id) => [...bookingKeys.all, "detail", id],
  timeline: (id) => [...bookingKeys.all, "timeline", id],
  draft: () => [...bookingKeys.all, "draft"],
};

export const technicianBrowseKeys = {
  all: ["technicians", "browse"],
  list: (filters) => [...technicianBrowseKeys.all, filters],
};

export default queryClient;
