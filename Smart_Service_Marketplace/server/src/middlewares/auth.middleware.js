import jwt from "jsonwebtoken";

import env from "../config/env.js";
import authRepository from "../repositories/auth.repository.js";
import apiKeyService from "../services/apiKey.service.js";
import { API_KEY_HEADER } from "../constants/security.js";

import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

async function authenticateApiKey(req) {
  const plainKey =
    req.headers[API_KEY_HEADER] ||
    req.headers[API_KEY_HEADER.toLowerCase()];

  if (!plainKey) return false;

  const result = await apiKeyService.verifyKey(String(plainKey).trim());

  if (!result) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid API key.");
  }

  req.user = result.user;
  req.apiKey = result.apiKey;
  req.authMethod = "apiKey";
  return true;
}

export const authenticate = async (req, res, next) => {
  try {
    if (req.authMethod === "apiKey" && req.user) {
      return next();
    }

    const apiKeyHeader =
      req.headers[API_KEY_HEADER] ||
      req.headers[API_KEY_HEADER.toLowerCase()];

    if (apiKeyHeader) {
      await authenticateApiKey(req);
      return next();
    }

    let token;

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return next(
        new ApiError(
          HTTP_STATUS.UNAUTHORIZED,
          "Access denied. No token provided."
        )
      );
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await authRepository.findById(decoded.id);

    if (!user) {
      return next(
        new ApiError(HTTP_STATUS.UNAUTHORIZED, "User not found.")
      );
    }

    if (!user.isActive) {
      return next(
        new ApiError(HTTP_STATUS.FORBIDDEN, "Account has been deactivated.")
      );
    }

    const tokenVersion = decoded.tokenVersion ?? 0;
    if (tokenVersion !== (user.tokenVersion ?? 0)) {
      return next(
        new ApiError(
          HTTP_STATUS.UNAUTHORIZED,
          "Token has been revoked. Please log in again."
        )
      );
    }

    req.user = user;
    req.authMethod = "jwt";

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(
        new ApiError(HTTP_STATUS.UNAUTHORIZED, "Token has expired.")
      );
    }

    if (error.name === "JsonWebTokenError") {
      return next(
        new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid token.")
      );
    }

    next(error);
  }
};
