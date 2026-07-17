import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";

import routes from "./routes/index.js";
import requestLogMiddleware from "./middlewares/logger.middleware.js";
import httpLoggerMiddleware from "./middlewares/httpLogger.middleware.js";
import performanceMiddleware from "./middlewares/performance.middleware.js";
import notFound from "./middlewares/notFound.middleware.js";
import errorHandler from "./middlewares/error.middleware.js";
import mongoSanitize from "./middlewares/mongoSanitize.middleware.js";
import xssSanitize from "./middlewares/xssSanitize.middleware.js";
import { globalLimiter } from "./middlewares/rateLimit.middleware.js";
import { setupSwagger } from "./config/swagger.js";
import { getCorsOptions, getHelmetOptions } from "./config/security.js";
import getRedisClient from "./config/redis.js";
import maintenanceMiddleware from "./middlewares/maintenance.middleware.js";

const app = express();

/* ---------- Security ---------- */

app.set("trust proxy", 1);

app.use(helmet(getHelmetOptions()));

app.use(cors(getCorsOptions()));

app.use(globalLimiter);

/* ---------- Parsers ---------- */

app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      if (req.originalUrl?.includes("/payments/webhook")) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

/* ---------- API Documentation (before sanitizers — read-only req.query) ---------- */

setupSwagger(app);

app.use(mongoSanitize);
app.use(xssSanitize);

app.use(
  compression({
    threshold: 1024,
    level: 6,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      if (req.originalUrl?.includes("/payments/webhook")) return false;
      return compression.filter(req, res);
    },
  })
);

/* ---------- Logger ---------- */

app.use(performanceMiddleware);
app.use(requestLogMiddleware);
app.use(httpLoggerMiddleware);

/* ---------- Cache warm-up ---------- */

getRedisClient();

/* ---------- Routes ---------- */

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Smart Service Marketplace API is running.",
    apiBase: "/api/v1",
    docs: "/api/docs",
    health: "/api/v1/health",
    timestamp: new Date().toISOString(),
  });
});

app.use(maintenanceMiddleware);

app.use("/api/v1", routes);

/* ---------- 404 & Errors ---------- */

app.use(notFound);
app.use(errorHandler);

export default app;
