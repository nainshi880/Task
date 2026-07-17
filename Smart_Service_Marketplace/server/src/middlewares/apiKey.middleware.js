import apiKeyService from "../services/apiKey.service.js";
import { API_KEY_HEADER } from "../constants/security.js";

export async function authenticateApiKey(req, res, next) {
  try {
    const plainKey =
      req.headers[API_KEY_HEADER] || req.headers[API_KEY_HEADER.toLowerCase()];

    if (!plainKey) {
      return next();
    }

    const result = await apiKeyService.verifyKey(String(plainKey).trim());

    if (!result) {
      const ApiError = (await import("../utils/ApiError.js")).default;
      const HTTP_STATUS = (await import("../constants/httpStatus.js")).default;
      return next(
        new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid API key.")
      );
    }

    req.user = result.user;
    req.apiKey = result.apiKey;
    req.authMethod = "apiKey";

    return next();
  } catch (error) {
    next(error);
  }
}

export default authenticateApiKey;
