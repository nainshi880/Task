import paymentService from "../services/payment.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

const actorMeta = (req) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent"),
});

export const createPaymentOrder = asyncHandler(async (req, res) => {
  const order = await paymentService.createOrder(
    req.user._id,
    req.body,
    actorMeta(req)
  );

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Payment order created successfully.",
      order
    )
  );
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.verifyPayment(
    req.user._id,
    req.body,
    actorMeta(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      result.alreadyPaid
        ? "Payment was already verified."
        : "Payment verified successfully.",
      result
    )
  );
});

export const getPaymentStatus = asyncHandler(async (req, res) => {
  const status = await paymentService.getPaymentStatus(
    req.user._id,
    req.params.paymentId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Payment status fetched successfully.",
      status
    )
  );
});

export const getPaymentByBooking = asyncHandler(async (req, res) => {
  const result = await paymentService.getPaymentByBooking(
    req.user._id,
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Booking payment status fetched successfully.",
      result
    )
  );
});

export const listMyPayments = asyncHandler(async (req, res) => {
  const result = await paymentService.listMyPayments(
    req.user._id,
    req.query
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Payments fetched successfully.",
      result
    )
  );
});

export const markPaymentFailed = asyncHandler(async (req, res) => {
  const payment = await paymentService.markPaymentFailed(
    req.user._id,
    req.body,
    actorMeta(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Payment marked as failed.",
      payment
    )
  );
});

export const retryPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.retryPayment(
    req.user._id,
    req.params.paymentId,
    actorMeta(req)
  );

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Payment retry order created successfully.",
      result
    )
  );
});

export const processRefund = asyncHandler(async (req, res) => {
  const result = await paymentService.processRefund(
    req.user,
    {
      paymentId: req.params.paymentId,
      ...req.body,
    },
    actorMeta(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Refund processed successfully.",
      result
    )
  );
});

export const recoverPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.recoverPayment(
    req.user._id,
    req.params.paymentId,
    actorMeta(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      result.recovered
        ? "Payment recovered successfully."
        : "Payment was already paid.",
      result
    )
  );
});

export const listRecoverablePayments = asyncHandler(async (req, res) => {
  const result = await paymentService.listRecoverablePayments(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Recoverable payments fetched successfully.",
      result
    )
  );
});

export const listAdminPayments = asyncHandler(async (req, res) => {
  const result = await paymentService.listAdminPayments(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Admin payments fetched successfully.",
      result
    )
  );
});

export const getPaymentAnalytics = asyncHandler(async (req, res) => {
  const result = await paymentService.getAnalytics(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Payment analytics fetched successfully.",
      result
    )
  );
});

export const getPaymentAuditLogs = asyncHandler(async (req, res) => {
  const result = await paymentService.getPaymentAuditLogs(
    req.params.paymentId,
    req.query
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Payment audit logs fetched successfully.",
      result
    )
  );
});

export const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const eventId = req.headers["x-razorpay-event-id"] || null;
  const rawBody = req.rawBody || JSON.stringify(req.body);

  const result = await paymentService.handleWebhook(
    rawBody,
    signature,
    eventId
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});
