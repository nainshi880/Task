import ApiError from "./ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

const SENSITIVE_FIELDS = new Set([
  "password",
  "currentPassword",
  "newPassword",
  "confirmPassword",
  "refreshToken",
]);

export function sanitizeBody(body) {
  if (!body || typeof body !== "object") return body;

  const clean = { ...body };
  for (const key of Object.keys(clean)) {
    if (SENSITIVE_FIELDS.has(key)) {
      clean[key] = "[REDACTED]";
    }
  }
  return clean;
}

export function normalizeError(err) {
  if (err instanceof ApiError) {
    return err;
  }

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      messages.join(", ") || "Validation failed."
    );
  }

  if (err.name === "CastError") {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid resource identifier.");
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return new ApiError(
      HTTP_STATUS.CONFLICT,
      `Duplicate value for ${field}.`
    );
  }

  if (err.name === "JsonWebTokenError") {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid token.");
  }

  if (err.name === "TokenExpiredError") {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, "Token has expired.");
  }

  if (err.type === "entity.parse.failed") {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid JSON payload.");
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, "File too large.");
  }

  return new ApiError(
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    err.message || "Internal server error."
  );
}

export default { sanitizeBody, normalizeError };
