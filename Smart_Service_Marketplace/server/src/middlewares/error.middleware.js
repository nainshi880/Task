import logger, { errorLogger } from "../utils/logger.js";
import ApiResponse from "../utils/ApiResponse.js";
import { normalizeError, sanitizeBody } from "../utils/errorNormalizer.js";
import HTTP_STATUS from "../constants/httpStatus.js";

const errorHandler = (err, req, res, _next) => {
  const normalized = normalizeError(err);
  const status = normalized.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  const errorEntry = {
    message: normalized.message,
    statusCode: status,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?._id?.toString() || null,
    body:
      req.method !== "GET" && req.body
        ? sanitizeBody(req.body)
        : undefined,
  };

  if (status >= 500) {
    errorLogger.error("unhandled_error", errorEntry);
    logger.error(normalized.message, {
      statusCode: status,
      url: req.originalUrl,
    });
  } else {
    logger.warn(normalized.message, {
      statusCode: status,
      url: req.originalUrl,
    });
  }

  const response = new ApiResponse(status, normalized.message);

  res.status(status).json({
    ...response,
    success: false,
    stack:
      process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

export default errorHandler;
