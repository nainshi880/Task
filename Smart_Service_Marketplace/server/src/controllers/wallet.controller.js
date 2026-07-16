import walletService from "../services/wallet.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const getWallet = asyncHandler(async (req, res) => {
  const wallet = await walletService.getWallet(req.user._id);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Wallet fetched successfully.", wallet)
  );
});

export const getWalletBalance = asyncHandler(async (req, res) => {
  const balance = await walletService.getBalance(req.user._id);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Wallet balance fetched successfully.",
      balance
    )
  );
});

export const listWalletTransactions = asyncHandler(async (req, res) => {
  const result = await walletService.listTransactions(
    req.user._id,
    req.query
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Wallet transactions fetched successfully.",
      result
    )
  );
});

export const getWalletHistory = asyncHandler(async (req, res) => {
  const history = await walletService.getHistory(req.user._id, req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Wallet history fetched successfully.",
      history
    )
  );
});

export const createWalletRecharge = asyncHandler(async (req, res) => {
  const order = await walletService.createRechargeOrder(
    req.user._id,
    req.body
  );

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Wallet recharge order created successfully.",
      order
    )
  );
});

export const verifyWalletRecharge = asyncHandler(async (req, res) => {
  const result = await walletService.verifyRecharge(req.user._id, req.body);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      result.alreadyPaid
        ? "Wallet recharge was already verified."
        : "Wallet recharged successfully.",
      result
    )
  );
});

export const payBookingWithWallet = asyncHandler(async (req, res) => {
  const result = await walletService.payBooking(req.user._id, req.body);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Booking paid with wallet successfully.",
      result
    )
  );
});

export const refundToWallet = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === "admin";

  const result = await walletService.refundToWallet({
    bookingId: req.body.bookingId,
    amount: req.body.amount,
    reason: req.body.reason,
    performedBy: req.user._id,
    customerId: isAdmin ? null : req.user._id,
  });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Amount refunded to wallet successfully.",
      result
    )
  );
});
