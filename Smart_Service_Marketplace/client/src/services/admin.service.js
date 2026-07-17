import * as adminApi from "../api/admin.api";

const unwrap = (response) => response.data?.data ?? response.data;

export const login = async (data) => unwrap(await adminApi.adminLogin(data));

export const logout = async () => unwrap(await adminApi.adminLogout());

export const getProfile = async () => unwrap(await adminApi.getAdminProfile());

export const listAdmins = async () => unwrap(await adminApi.listAdmins());

export const createAdmin = async (data) =>
  unwrap(await adminApi.createAdmin(data));

export const getDashboardMetrics = async (params) =>
  unwrap(await adminApi.getDashboardMetrics(params));

export const getGrowthCharts = async (params) =>
  unwrap(await adminApi.getGrowthCharts(params));

export const getMonthlyReports = async (params) =>
  unwrap(await adminApi.getMonthlyReports(params));

export const getRevenueAnalytics = async (params) =>
  unwrap(await adminApi.getRevenueAnalytics(params));

export const getAuditLogs = async (params) =>
  unwrap(await adminApi.getAuditLogs(params));

/* ── Customers ── */
export const listCustomers = async (params) =>
  unwrap(await adminApi.listCustomers(params));

export const searchCustomers = async (params) =>
  unwrap(await adminApi.searchCustomers(params));

export const filterCustomers = async (params) =>
  unwrap(await adminApi.filterCustomers(params));

export const getCustomerDetails = async (userId) =>
  unwrap(await adminApi.getCustomerDetails(userId));

export const getCustomerActivity = async (userId, params) =>
  unwrap(await adminApi.getCustomerActivity(userId, params));

export const blockCustomer = async (userId) =>
  unwrap(await adminApi.blockCustomer(userId));

export const unblockCustomer = async (userId) =>
  unwrap(await adminApi.unblockCustomer(userId));

export const deleteCustomer = async (userId) =>
  unwrap(await adminApi.deleteCustomer(userId));

export const listAdminBookings = async (params) =>
  unwrap(await adminApi.listAdminBookings(params));

export const searchAdminBookings = async (params) =>
  unwrap(await adminApi.searchAdminBookings(params));

export const filterAdminBookings = async (params) =>
  unwrap(await adminApi.filterAdminBookings(params));

export const fetchAdminBookings = async (params = {}) => {
  const {
    q,
    search,
    status,
    paymentStatus,
    serviceCategory,
    category,
    customerId,
    technicianId,
    fromDate,
    toDate,
    ...rest
  } = params;
  const term = (q || search || "").trim();
  const filters = {
    status,
    paymentStatus,
    serviceCategory: serviceCategory || category,
    category: category || serviceCategory,
    customerId,
    technicianId,
    fromDate,
    toDate,
  };
  const hasFilter = Object.values(filters).some(
    (v) => v !== undefined && v !== null && v !== ""
  );

  if (term) {
    return searchAdminBookings({ ...rest, ...filters, q: term });
  }
  if (hasFilter) {
    return filterAdminBookings({ ...rest, ...filters });
  }
  return listAdminBookings(rest);
};

export const getAdminBookingDetails = async (bookingId) =>
  unwrap(await adminApi.getAdminBookingDetails(bookingId));

export const getAdminBookingTimeline = async (bookingId) =>
  unwrap(await adminApi.getAdminBookingTimeline(bookingId));

export const reassignBookingTechnician = async (bookingId, data) =>
  unwrap(await adminApi.reassignBookingTechnician(bookingId, data));

export const cancelAdminBooking = async (bookingId, data) =>
  unwrap(await adminApi.cancelAdminBooking(bookingId, data));

export const refundAdminBooking = async (bookingId, data) =>
  unwrap(await adminApi.refundAdminBooking(bookingId, data));

/* ── Categories ── */
export const listServiceCategories = async (params) =>
  unwrap(await adminApi.listServiceCategories(params));

export const createServiceCategory = async (data) =>
  unwrap(await adminApi.createServiceCategory(data));

export const updateServiceCategory = async (categoryId, data) =>
  unwrap(await adminApi.updateServiceCategory(categoryId, data));

export const deleteServiceCategory = async (categoryId) =>
  unwrap(await adminApi.deleteServiceCategory(categoryId));

/* ── Payments ── */
export const listPaymentTransactions = async (params) =>
  unwrap(await adminApi.listPaymentTransactions(params));

export const getPaymentDetails = async (paymentId, params) =>
  unwrap(await adminApi.getPaymentDetails(paymentId, params));

export const refundPayment = async (paymentId, data) =>
  unwrap(await adminApi.refundPayment(paymentId, data));

export const listPaymentRefunds = async (params) =>
  unwrap(await adminApi.listPaymentRefunds(params));

export const listTechnicianPayouts = async (params) =>
  unwrap(await adminApi.listTechnicianPayouts(params));

export const updateTechnicianPayout = async (payoutId, data) =>
  unwrap(await adminApi.updateTechnicianPayout(payoutId, data));

export const getPaymentReports = async (params) =>
  unwrap(await adminApi.getPaymentReports(params));

/** Pick list / search / filter based on active controls. */
export const fetchCustomers = async (params = {}) => {
  const { q, search, city, gender, profileCompleted, isActive, isVerified, ...rest } =
    params;
  const term = (q || search || "").trim();
  const hasFilter = [city, gender, profileCompleted, isActive, isVerified].some(
    (v) => v !== undefined && v !== null && v !== ""
  );

  if (term) {
    return searchCustomers({ ...rest, q: term, city, gender, profileCompleted, isActive, isVerified });
  }
  if (hasFilter) {
    return filterCustomers({
      ...rest,
      city,
      gender,
      profileCompleted,
      isActive,
      isVerified,
    });
  }
  return listCustomers(rest);
};

/* ── Technicians ── */
export const listTechnicians = async (params) =>
  unwrap(await adminApi.listTechnicians(params));

export const listPendingTechnicians = async (params) =>
  unwrap(await adminApi.listPendingTechnicians(params));

export const getTechnicianDetails = async (technicianId) =>
  unwrap(await adminApi.getTechnicianDetails(technicianId));

export const verifyTechnician = async (technicianId) =>
  unwrap(await adminApi.verifyTechnician(technicianId));

export const approveTechnician = async (technicianId) =>
  unwrap(await adminApi.approveTechnician(technicianId));

export const rejectTechnician = async (technicianId, data) =>
  unwrap(await adminApi.rejectTechnician(technicianId, data));

export const suspendTechnician = async (technicianId, data) =>
  unwrap(await adminApi.suspendTechnician(technicianId, data));

export const unsuspendTechnician = async (technicianId) =>
  unwrap(await adminApi.unsuspendTechnician(technicianId));

export const getTechnicianEarnings = async (technicianId, params) =>
  unwrap(await adminApi.getTechnicianEarnings(technicianId, params));

export const getTechnicianRatings = async (technicianId) =>
  unwrap(await adminApi.getTechnicianRatings(technicianId));

/* ── Reviews ── */
export const listAdminReviews = async (params) =>
  unwrap(await adminApi.listAdminReviews(params));

export const listReportedReviews = async (params) =>
  unwrap(await adminApi.listReportedReviews(params));

export const getReviewAnalytics = async (params) =>
  unwrap(await adminApi.getReviewAnalytics(params));

export const getAdminReviewDetails = async (reviewId) =>
  unwrap(await adminApi.getAdminReviewDetails(reviewId));

export const approveReview = async (reviewId, data) =>
  unwrap(await adminApi.approveReview(reviewId, data));

export const rejectReview = async (reviewId, data) =>
  unwrap(await adminApi.rejectReview(reviewId, data));

export const deleteReview = async (reviewId, data) =>
  unwrap(await adminApi.deleteReview(reviewId, data));

export const resolveReviewReport = async (reviewId, reportId, data) =>
  unwrap(await adminApi.resolveReviewReport(reviewId, reportId, data));

/* ── Reports ── */
export const getBookingReports = async (params) =>
  unwrap(await adminApi.getBookingReports(params));

export const getRevenueReports = async (params) =>
  unwrap(await adminApi.getRevenueReports(params));

export const getAdminPaymentReports = async (params) =>
  unwrap(await adminApi.getAdminPaymentReports(params));

function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const downloadReportCsv = async (reportType, params = {}) => {
  const response = await adminApi.downloadReportCsv(reportType, params);
  const disposition = response.headers?.["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename =
    match?.[1] || `${reportType}-report-${Date.now()}.csv`;
  triggerBlobDownload(response.data, filename);
};

export const exportRowsAsCsv = (filename, headers, rows) => {
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  triggerBlobDownload(blob, filename);
};

/* ── Platform settings ── */
export const getPlatformSettings = async () =>
  unwrap(await adminApi.getPlatformSettings());

export const updatePlatformSettings = async (data) =>
  unwrap(await adminApi.updatePlatformSettings(data));

export const updateMaintenanceSettings = async (data) =>
  unwrap(await adminApi.updateMaintenanceSettings(data));

export const updateTermsOfService = async (data) =>
  unwrap(await adminApi.updateTermsOfService(data));

export const updatePrivacyPolicy = async (data) =>
  unwrap(await adminApi.updatePrivacyPolicy(data));

export const listBanners = async (params) =>
  unwrap(await adminApi.listBanners(params));

export const createBanner = async (data) =>
  unwrap(await adminApi.createBanner(data));

export const updateBanner = async (bannerId, data) =>
  unwrap(await adminApi.updateBanner(bannerId, data));

export const deleteBanner = async (bannerId) =>
  unwrap(await adminApi.deleteBanner(bannerId));

/* ── Admin profile ── */
export const updateAdminProfile = async (data) =>
  unwrap(await adminApi.updateAdminProfile(data));

export const changeAdminPassword = async (data) =>
  unwrap(await adminApi.changeAdminPassword(data));

export const logoutAllAdminSessions = async () =>
  unwrap(await adminApi.logoutAllAdminSessions());
