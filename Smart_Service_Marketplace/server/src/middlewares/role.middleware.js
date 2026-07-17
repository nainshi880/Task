import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";
import ROLES from "../constants/roles.js";

/**
 * Authorize by role. Super Admin inherits every route that requires Admin.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new ApiError(HTTP_STATUS.UNAUTHORIZED, "Authentication required.")
      );
    }

    const userRole = req.user.role;

    if (roles.includes(userRole)) {
      return next();
    }

    // Super Admin inherits Admin permissions
    if (userRole === ROLES.SUPER_ADMIN && roles.includes(ROLES.ADMIN)) {
      return next();
    }

    return next(
      new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You do not have permission to access this resource."
      )
    );
  };
};

export default authorize;
