import { claimIdempotencyKey } from "../utils/idempotency.js";
import metricsStore from "../utils/metrics.js";
import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

/**
 * Require Idempotency-Key header (or body.idempotencyKey) for mutating routes.
 * Duplicates within TTL return 409 Conflict.
 */
export default function idempotencyMiddleware({
  ttlSeconds = 60 * 60 * 24,
  headerName = "idempotency-key",
  required = true,
  prefix = "http",
} = {}) {
  return async (req, _res, next) => {
    try {
      const key =
        req.headers[headerName] ||
        req.headers["x-idempotency-key"] ||
        req.body?.idempotencyKey;

      if (!key) {
        if (required) {
          throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            "Idempotency-Key header is required."
          );
        }
        return next();
      }

      const scope = `${prefix}:${req.method}:${req.baseUrl}${req.path}:${key}`;
      const claim = await claimIdempotencyKey(scope, {
        ttlSeconds,
        payload: JSON.stringify({
          at: new Date().toISOString(),
          path: req.originalUrl,
        }),
      });

      if (!claim.ok) {
        metricsStore.recordIdempotency("duplicate");
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          "Duplicate request. Idempotency key was already used."
        );
      }

      metricsStore.recordIdempotency("claimed");
      req.idempotencyKey = String(key);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
