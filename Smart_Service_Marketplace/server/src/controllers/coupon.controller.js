import couponService from "../services/coupon.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const validateCoupon = asyncHandler(async (req, res) => {
  const result = await couponService.validateCoupon(req.user._id, req.body);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Coupon is valid.", result)
  );
});

export const applyCoupon = asyncHandler(async (req, res) => {
  const result = await couponService.applyToBooking(req.user._id, req.body);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Coupon applied successfully.",
      result
    )
  );
});

export const removeCoupon = asyncHandler(async (req, res) => {
  const result = await couponService.removeFromBooking(
    req.user._id,
    req.params.bookingId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Coupon removed successfully.",
      result
    )
  );
});

export const getMyReferral = asyncHandler(async (req, res) => {
  const result = await couponService.ensureReferralCode(req.user._id);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Referral details fetched successfully.",
      result
    )
  );
});

export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.createCoupon(req.user._id, req.body);

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Coupon created successfully.",
      coupon
    )
  );
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.updateCoupon(
    req.params.couponId,
    req.body
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Coupon updated successfully.", coupon)
  );
});

export const getCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.getCoupon(req.params.couponId);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Coupon fetched successfully.", coupon)
  );
});

export const listCoupons = asyncHandler(async (req, res) => {
  const result = await couponService.listCoupons(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Coupons fetched successfully.", result)
  );
});

export const deactivateCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.deactivateCoupon(req.params.couponId);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Coupon deactivated successfully.",
      coupon
    )
  );
});
