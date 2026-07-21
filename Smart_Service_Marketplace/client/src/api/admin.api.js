import api from "./axios";

export const adminLogin = (data) => api.post("/admin/login", data);

export const adminLogout = () => api.post("/admin/logout");

export const getAdminProfile = () => api.get("/admin/profile");

export const listAdmins = () => api.get("/admin/admins");

export const createAdmin = (data) => api.post("/admin/admins", data);

export const getDashboardMetrics = (params) =>
  api.get("/admin/analytics", { params });

export const getGrowthCharts = (params) =>
  api.get("/admin/analytics/growth", { params });

export const getMonthlyReports = (params) =>
  api.get("/admin/reports/monthly", { params });

export const getRevenueAnalytics = (params) =>
  api.get("/admin/payments/revenue", { params });

export const getAuditLogs = (params) =>
  api.get("/admin/audit-logs", { params });

/* ── Customers / users ── */
export const listCustomers = (params) =>
  api.get("/admin/users", { params });

export const searchCustomers = (params) =>
  api.get("/admin/users/search", { params });

export const filterCustomers = (params) =>
  api.get("/admin/users/filter", { params });

export const getCustomerDetails = (userId) =>
  api.get(`/admin/users/${userId}`);

export const getCustomerActivity = (userId, params) =>
  api.get(`/admin/users/${userId}/activity`, { params });

export const blockCustomer = (userId) =>
  api.patch(`/admin/users/${userId}/block`);

export const unblockCustomer = (userId) =>
  api.patch(`/admin/users/${userId}/unblock`);

export const deleteCustomer = (userId) =>
  api.delete(`/admin/users/${userId}`);

export const listAdminBookings = (params) =>
  api.get("/admin/bookings", { params });

export const searchAdminBookings = (params) =>
  api.get("/admin/bookings/search", { params });

export const filterAdminBookings = (params) =>
  api.get("/admin/bookings/filter", { params });

export const getAdminBookingDetails = (bookingId) =>
  api.get(`/admin/bookings/${bookingId}`);

export const getAdminBookingTimeline = (bookingId) =>
  api.get(`/admin/bookings/${bookingId}/timeline`);

export const reassignBookingTechnician = (bookingId, data) =>
  api.patch(`/admin/bookings/${bookingId}/reassign`, data);

export const cancelAdminBooking = (bookingId, data) =>
  api.patch(`/admin/bookings/${bookingId}/cancel`, data);

export const refundAdminBooking = (bookingId, data) =>
  api.post(`/admin/bookings/${bookingId}/refund`, data);

/* ── Service categories (settings) ── */
export const listServiceCategories = (params) =>
  api.get("/admin/settings/categories", { params });

export const createServiceCategory = (data) =>
  api.post("/admin/settings/categories", data);

export const updateServiceCategory = (categoryId, data) =>
  api.patch(`/admin/settings/categories/${categoryId}`, data);

export const deleteServiceCategory = (categoryId) =>
  api.delete(`/admin/settings/categories/${categoryId}`);

/* ── Payments ── */
export const listPaymentTransactions = (params) =>
  api.get("/admin/payments/transactions", { params });

export const getPaymentDetails = (paymentId, params) =>
  api.get(`/admin/payments/transactions/${paymentId}`, { params });

export const refundPayment = (paymentId, data) =>
  api.post(`/admin/payments/transactions/${paymentId}/refund`, data);

export const listPaymentRefunds = (params) =>
  api.get("/admin/payments/refunds", { params });

export const getPaymentReports = (params) =>
  api.get("/admin/payments/reports", { params });

/* ── Technicians ── */
export const listTechnicians = (params) =>
  api.get("/admin/technicians", { params });

export const listPendingTechnicians = (params) =>
  api.get("/admin/technicians/applications/pending", { params });

export const getTechnicianDetails = (technicianId) =>
  api.get(`/admin/technicians/${technicianId}`);

export const verifyTechnician = (technicianId) =>
  api.patch(`/admin/technicians/${technicianId}/verify`);

export const approveTechnician = (technicianId) =>
  api.patch(`/admin/technicians/${technicianId}/approve`);

export const rejectTechnician = (technicianId, data) =>
  api.patch(`/admin/technicians/${technicianId}/reject`, data);

export const suspendTechnician = (technicianId, data) =>
  api.patch(`/admin/technicians/${technicianId}/suspend`, data);

export const unsuspendTechnician = (technicianId) =>
  api.patch(`/admin/technicians/${technicianId}/unsuspend`);

export const getTechnicianRatings = (technicianId) =>
  api.get(`/admin/technicians/${technicianId}/ratings`);

/* ── Reviews ── */
export const listAdminReviews = (params) =>
  api.get("/admin/reviews", { params });

export const listReportedReviews = (params) =>
  api.get("/admin/reviews/reported", { params });

export const getReviewAnalytics = (params) =>
  api.get("/admin/reviews/analytics", { params });

export const getAdminReviewDetails = (reviewId) =>
  api.get(`/admin/reviews/${reviewId}`);

export const approveReview = (reviewId, data) =>
  api.patch(`/admin/reviews/${reviewId}/approve`, data);

export const rejectReview = (reviewId, data) =>
  api.patch(`/admin/reviews/${reviewId}/reject`, data);

export const deleteReview = (reviewId, data) =>
  api.delete(`/admin/reviews/${reviewId}`, { data });

export const resolveReviewReport = (reviewId, reportId, data) =>
  api.patch(`/admin/reviews/${reviewId}/reports/${reportId}`, data);

/* ── Reports ── */
export const getBookingReports = (params) =>
  api.get("/admin/reports/bookings", { params });

export const getRevenueReports = (params) =>
  api.get("/admin/reports/revenue", { params });

export const getAdminPaymentReports = (params) =>
  api.get("/admin/reports/payments", { params });

export const downloadReportCsv = (path, params) =>
  api.get(`/admin/reports/${path}`, {
    params: { ...params, format: "csv" },
    responseType: "blob",
  });

/* ── Platform settings ── */
export const getPlatformSettings = () => api.get("/admin/settings");

export const updatePlatformSettings = (data) =>
  api.put("/admin/settings", data);

export const updateMaintenanceSettings = (data) =>
  api.patch("/admin/settings/maintenance", data);

export const updateTermsOfService = (data) =>
  api.put("/admin/settings/terms", data);

export const updatePrivacyPolicy = (data) =>
  api.put("/admin/settings/privacy", data);

/* ── Admin profile ── */
export const updateAdminProfile = (data) => api.put("/admin/profile", data);

export const changeAdminPassword = (data) =>
  api.put("/admin/change-password", data);

export const logoutAllAdminSessions = () => api.post("/admin/logout-all");
