import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import routes from "./routes/index.js";
import logger from "./middlewares/logger.middleware.js";
import notFound from "./middlewares/notFound.middleware.js";
import errorHandler from "./middlewares/error.middleware.js";
import loggerMiddleware from "./middlewares/logger.middleware.js";
const app = express();

/* ---------- Security ---------- */

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

/* ---------- Rate Limiter ---------- */

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

/* ---------- Parsers ---------- */

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(compression());


/* ---------- Logger ---------- */


app.use(loggerMiddleware);

app.use(logger);
 
/* ---------- Routes ---------- */

app.use("/api/v1", routes);

export default app;