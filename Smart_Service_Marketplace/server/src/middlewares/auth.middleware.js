import jwt from "jsonwebtoken";

import env from "../config/env.js";
import authRepository from "../repositories/auth.repository.js";
import { isAdminRole } from "../constants/roles.js";

import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const authenticate = async (req, res, next) => {
  try {
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

/**
 * Requires authenticate first. Blocks customers/technicians until email is verified.
 * Admins are exempt.
 */
export const requireEmailVerified = (req, res, next) => {
  const user = req.user;
  if (!user) {
    return next(
      new ApiError(HTTP_STATUS.UNAUTHORIZED, "Authentication required.")
    );
  }

  if (isAdminRole(user.role) || user.isVerified) {
    return next();
  }

  return next(
    new ApiError(
      HTTP_STATUS.FORBIDDEN,
      "Please verify your email before continuing."
    )
  );
};
