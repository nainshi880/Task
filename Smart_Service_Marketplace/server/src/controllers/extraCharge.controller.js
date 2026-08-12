import extraChargeService from "../services/extraCharge.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const createExtraCharge = asyncHandler(async (req, res) => {
  const extraCharge = await extraChargeService.createExtraCharge(
    req.user._id,
    req.params.bookingId,
    {
      description: req.body.description,
      amount: req.body.amount,
    },
    req.files || []
  );

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Extra charge requested. Customer has been notified.",
      extraCharge
    )
  );
});

export const listExtraCharges = asyncHandler(async (req, res) => {
  const items = await extraChargeService.listByBooking(
    req.user._id,
    req.params.bookingId,
    req.user.role
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Extra charges fetched successfully.",
      { items }
    )
  );
});

export const acceptExtraCharge = asyncHandler(async (req, res) => {
  const extraCharge = await extraChargeService.acceptExtraCharge(
    req.user._id,
    req.params.extraChargeId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Extra charge accepted. Please complete payment.",
      extraCharge
    )
  );
});

export const rejectExtraCharge = asyncHandler(async (req, res) => {
  const extraCharge = await extraChargeService.rejectExtraCharge(
    req.user._id,
    req.params.extraChargeId,
    req.body.rejectionReason
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Extra charge rejected. Technician will complete the original scope only.",
      extraCharge
    )
  );
});
