import ApiError from "../utils/ApiError.js";
import HTTP_STATUS from "../constants/httpStatus.js";

const authorize = (...roles) => {

  return (req, res, next) => {

    if (!req.user) {

      return next(
        new ApiError(
          HTTP_STATUS.UNAUTHORIZED,
          "Authentication required."
        )
      );

    }

    if (!roles.includes(req.user.role)) {

      return next(
        new ApiError(
          HTTP_STATUS.FORBIDDEN,
          "You do not have permission to access this resource."
        )
      );

    }

    next();

  };

};

export default authorize;