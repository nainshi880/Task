export default function performanceMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  const originalEnd = res.end;

  res.end = function performanceEnd(...args) {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

    if (!res.headersSent) {
      res.setHeader("X-Response-Time", `${durationMs.toFixed(2)}ms`);
    }

    return originalEnd.apply(this, args);
  };

  next();
}
