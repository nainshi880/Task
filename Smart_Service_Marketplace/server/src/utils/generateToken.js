import jwt from "jsonwebtoken";
import env from "../config/env.js";

const generateToken = (payload) => {
  return jwt.sign(
    {
      ...payload,
      tokenVersion: payload.tokenVersion ?? 0,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN || env.JWT_EXPIRES_IN || "15m",
    }
  );
};

export default generateToken;
