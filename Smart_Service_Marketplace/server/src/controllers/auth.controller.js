import authService from "../services/auth.service.js";

import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import HTTP_STATUS from "../constants/httpStatus.js";

// Register User   

export const register = asyncHandler(async (req, res) => {

  const result = await authService.register(req.body);

  res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        "User registered successfully.",
        result
      )
    );

});

// Login User

export const login = asyncHandler(async (req, res) => {

  const { email, password } = req.body;

  const result = await authService.login(
    email,
    password
  );

  res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        "Login successful.",
        result
      )
    );

});

// Forgot Password

export const forgotPassword =
asyncHandler(async (req, res) => {

    const result =
        await authService.forgotPassword(
            req.body.email
        );

    res.status(HTTP_STATUS.OK).json(

        new ApiResponse(
            HTTP_STATUS.OK,
            result.message
        )

    );

});

// Logout User

export const logout = asyncHandler(async (req, res) => {

  const result = await authService.logout();

  res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        result.message
      )
    );

});

// Get Current User

export const getCurrentUser = asyncHandler(async (req, res) => {

  const user = await authService.getCurrentUser(
    req.user._id
  );

  res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        "Current user fetched successfully.",
        user
      )
    );

});

// Reset Password

export const resetPassword = asyncHandler(async (req, res) => {

    const { token } = req.params;

    const { password } = req.body;

    const result =
        await authService.resetPassword(
            token,
            password
        );

    res.status(HTTP_STATUS.OK).json(

        new ApiResponse(

            HTTP_STATUS.OK,

            "Password reset successfully.",

            result

        )

    );

});

// Send Verification Email

export const sendVerificationEmail =
asyncHandler(async(req,res)=>{

const result=
await authService.sendVerificationEmail(
req.user._id
);

res.status(
HTTP_STATUS.OK
).json(

new ApiResponse(

HTTP_STATUS.OK,

result.message

)

);

});

// Verify Email

export const verifyEmail =
asyncHandler(async(req,res)=>{

const result=
await authService.verifyEmail(
req.params.token
);

res.status(
HTTP_STATUS.OK
).json(

new ApiResponse(

HTTP_STATUS.OK,

result.message

)

);

});