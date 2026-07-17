import morgan from "morgan";
import { httpLogger } from "../utils/logger.js";
import env from "../config/env.js";

const morganFormat =
  env.NODE_ENV === "production" ? "combined" : "dev";

const stream = {
  write(message) {
    httpLogger.info(message.trim());
  },
};

const httpLoggerMiddleware = morgan(morganFormat, {
  stream,
  skip(req) {
    const url = req.originalUrl || "";
    return (
      url.includes("/health") ||
      url.includes("/ready") ||
      url.includes("/metrics")
    );
  },
});

export default httpLoggerMiddleware;
