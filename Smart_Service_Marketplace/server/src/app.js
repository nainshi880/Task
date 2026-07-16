import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import routes from "./routes/index.js";
import loggerMiddleware from "./middlewares/logger.middleware.js";
import notFound from "./middlewares/notFound.middleware.js";
import errorHandler from "./middlewares/error.middleware.js";
import { setupSwagger } from "./config/swagger.js";
import getRedisClient from "./config/redis.js";

const app = express();

/* ---------- Security ---------- */

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

/* ---------- Global Rate Limiter ---------- */

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* ---------- Parsers ---------- */

app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      // Preserve raw body for Razorpay webhook signature verification
      if (req.originalUrl?.includes("/payments/webhook")) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

/* ---------- Logger ---------- */

app.use(loggerMiddleware);
app.use(morgan("dev"));

/* ---------- Cache warm-up ---------- */

getRedisClient();

/* ---------- API Documentation ---------- */

setupSwagger(app);

/* ---------- Routes ---------- */

app.use("/api/v1", routes);

/* ---------- 404 & Errors ---------- */

app.use(notFound);
app.use(errorHandler);

export default app;
