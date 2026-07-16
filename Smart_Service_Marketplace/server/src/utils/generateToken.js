import jwt from "jsonwebtoken";
import env from "../config/env.js";

const generateToken = (payload) => {
  return jwt.sign(
    payload,
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );
};

export default generateToken;