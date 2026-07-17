import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import { COOKIE_NAMES } from "../constants/security.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export default function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const hasRefreshCookie = Boolean(req.cookies?.[COOKIE_NAMES.REFRESH]);

  if (!hasRefreshCookie) {
    return next();
  }

  const headerToken = req.headers["x-csrf-token"];
  const cookieToken = req.cookies?.[COOKIE_NAMES.CSRF];

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return next(
      new ApiError(HTTP_STATUS.FORBIDDEN, "Invalid or missing CSRF token.")
    );
  }

  next();
}
