import adminReportsService from "../services/adminReports.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import { sendCsvResponse } from "../utils/csvExport.js";

async function respondWithReport(req, res, fetchReport, fetchCsv, message) {
  if (req.query.format === "csv") {
    const { filename, headers, rows } = await fetchCsv(req.query);
    return sendCsvResponse(res, filename, headers, rows);
  }

  const result = await fetchReport(req.query);
  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, message, result)
  );
}

export const getBookingReports = asyncHandler(async (req, res) => {
  await respondWithReport(
    req,
    res,
    (q) => adminReportsService.getBookingReports(q),
    (q) => adminReportsService.getBookingCsvRows(q),
    "Booking reports fetched successfully."
  );
});

export const getRevenueReports = asyncHandler(async (req, res) => {
  await respondWithReport(
    req,
    res,
    (q) => adminReportsService.getRevenueReports(q),
    (q) => adminReportsService.getRevenueCsvRows(q),
    "Revenue reports fetched successfully."
  );
});

export const getPaymentReports = asyncHandler(async (req, res) => {
  await respondWithReport(
    req,
    res,
    (q) => adminReportsService.getPaymentReports(q),
    (q) => adminReportsService.getPaymentCsvRows(q),
    "Payment reports fetched successfully."
  );
});

export const getMonthlyReports = asyncHandler(async (req, res) => {
  const result = await adminReportsService.getMonthlyReports(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Monthly reports fetched successfully.",
      result
    )
  );
});
