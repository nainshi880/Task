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

export const technicianKeys = {
  all: ["technician"],
  dashboard: () => [...technicianKeys.all, "dashboard"],
  profile: () => [...technicianKeys.all, "profile"],
  jobs: (filters) => [...technicianKeys.all, "jobs", filters],
  job: (id) => [...technicianKeys.all, "job", id],
  availability: () => [...technicianKeys.all, "availability"],
  earningsSummary: () => [...technicianKeys.all, "earnings", "summary"],
  earningsMonthly: (params) => [
    ...technicianKeys.all,
    "earnings",
    "monthly",
    params,
  ],
  payouts: (filters) => [...technicianKeys.all, "payouts", filters],
  reviews: (filters) => [...technicianKeys.all, "reviews", filters],
};

export const notificationKeys = {
  all: ["notifications"],
  list: (filters) => [...notificationKeys.all, "list", filters],
  unread: () => [...notificationKeys.all, "unread"],
  preferences: () => [...notificationKeys.all, "preferences"],
};

export const chatKeys = {
  all: ["chat"],
  rooms: (params) => [...chatKeys.all, "rooms", params],
  room: (id) => [...chatKeys.all, "room", id],
  messages: (id, params) => [...chatKeys.all, "messages", id, params],
  presence: (id) => [...chatKeys.all, "presence", id],
};

export const adminKeys = {
  all: ["admin"],
  dashboard: (params) => [...adminKeys.all, "dashboard", params],
  growth: (params) => [...adminKeys.all, "growth", params],
  monthly: (params) => [...adminKeys.all, "monthly", params],
  revenue: (params) => [...adminKeys.all, "revenue", params],
  auditLogs: (params) => [...adminKeys.all, "audit-logs", params],
  customers: (params) => [...adminKeys.all, "customers", params],
  customer: (id) => [...adminKeys.all, "customer", id],
  customerBookings: (id, params) => [
    ...adminKeys.all,
    "customer",
    id,
    "bookings",
    params,
  ],
  technicians: (params) => [...adminKeys.all, "technicians", params],
  technician: (id) => [...adminKeys.all, "technician", id],
  technicianEarnings: (id, params) => [
    ...adminKeys.all,
    "technician",
    id,
    "earnings",
    params,
  ],
  technicianRatings: (id) => [
    ...adminKeys.all,
    "technician",
    id,
    "ratings",
  ],
  bookings: (params) => [...adminKeys.all, "bookings", params],
  booking: (id) => [...adminKeys.all, "booking", id],
  bookingTimeline: (id) => [...adminKeys.all, "booking", id, "timeline"],
  categories: (params) => [...adminKeys.all, "categories", params],
  payments: (params) => [...adminKeys.all, "payments", params],
  payment: (id) => [...adminKeys.all, "payment", id],
  refunds: (params) => [...adminKeys.all, "refunds", params],
  payouts: (params) => [...adminKeys.all, "payouts", params],
  paymentReports: (params) => [...adminKeys.all, "payment-reports", params],
  reviews: (params) => [...adminKeys.all, "reviews", params],
  review: (id) => [...adminKeys.all, "review", id],
  reviewAnalytics: (params) => [...adminKeys.all, "review-analytics", params],
  bookingReports: (params) => [...adminKeys.all, "booking-reports", params],
  revenueReports: (params) => [...adminKeys.all, "revenue-reports", params],
  settings: () => [...adminKeys.all, "settings"],
  banners: (params) => [...adminKeys.all, "banners", params],
  profile: () => [...adminKeys.all, "profile"],
};

export default queryClient;
