import subscriptionService from "../services/subscription.service.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

/**
 * Blocks technicians who cannot accept jobs due to subscription limits.
 */
export async function requireJobClaimAccess(req, _res, next) {
  try {
    await subscriptionService.assertCanClaimJob(req.user._id);
    next();
  } catch (error) {
    next(error);
  }
}

export default requireJobClaimAccess;
