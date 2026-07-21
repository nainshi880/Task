import adminPaymentService from "../services/adminPayment.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

function actorContext(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

export const listAdminTransactions = asyncHandler(async (req, res) => {
  const result = await adminPaymentService.listTransactions(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Transactions fetched successfully.", result)
  );
});

export const getAdminTransactionDetails = asyncHandler(async (req, res) => {
  const result = await adminPaymentService.getTransactionDetails(
    req.params.paymentId,
    req.query
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Transaction details fetched.", result)
  );
});

export const getAdminPaymentReports = asyncHandler(async (req, res) => {
  const result = await adminPaymentService.getPaymentReports(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Payment reports fetched.", result)
  );
});

export const getAdminRevenueTracking = asyncHandler(async (req, res) => {
  const result = await adminPaymentService.getRevenueTracking(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Revenue tracking fetched.", result)
  );
});

export const listAdminRefunds = asyncHandler(async (req, res) => {
  const result = await adminPaymentService.listRefunds(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Refunds fetched successfully.", result)
  );
});

export const processAdminRefund = asyncHandler(async (req, res) => {
  const result = await adminPaymentService.processRefund(
    req.user,
    req.params.paymentId,
    req.body,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Refund processed successfully.", result)
  );
});

export const listAdminFailedPayments = asyncHandler(async (req, res) => {
  const result = await adminPaymentService.listFailedPayments(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Failed payments fetched.", result)
  );
});

export const listAdminRecoverablePayments = asyncHandler(async (req, res) => {
  const result = await adminPaymentService.listRecoverablePayments(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Recoverable payments fetched.",
      result
    )
  );
});

export const recoverAdminPayment = asyncHandler(async (req, res) => {
  const result = await adminPaymentService.recoverFailedPayment(
    req.user._id,
    req.params.paymentId,
    actorContext(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Payment recovery completed.", result)
  );
});

