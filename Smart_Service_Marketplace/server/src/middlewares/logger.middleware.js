import { requestLogger } from "../utils/logger.js";
import metricsStore from "../utils/metrics.js";

function normalizePath(url = "") {
  return url
    .split("?")[0]
    .replace(/\/[a-f0-9]{24}/gi, "/:id")
    .replace(/\/\d+/g, "/:id");
}

export default function requestLogMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const path = normalizePath(req.originalUrl);

    const entry = {
      method: req.method,
      path,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: req.ip,
      userAgent: req.get("user-agent") || "",
      userId: req.user?._id?.toString() || null,
      authMethod: req.authMethod || null,
    };

    requestLogger.info("request_completed", entry);
    metricsStore.recordRequest({
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs: entry.durationMs,
    });
  });

  next();
}
