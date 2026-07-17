const MAX_ROUTE_SAMPLES = 50;

class MetricsStore {
  constructor() {
    this.startedAt = Date.now();
    this.requests = {
      total: 0,
      byMethod: {},
      byStatus: {},
      errors: 0,
    };
    this.responseTimes = {
      count: 0,
      totalMs: 0,
      minMs: Infinity,
      maxMs: 0,
    };
    this.routes = new Map();
  }

  recordRequest({ method, path, statusCode, durationMs }) {
    this.requests.total += 1;
    this.requests.byMethod[method] = (this.requests.byMethod[method] || 0) + 1;

    const statusGroup = `${Math.floor(statusCode / 100)}xx`;
    this.requests.byStatus[statusGroup] =
      (this.requests.byStatus[statusGroup] || 0) + 1;

    if (statusCode >= 500) {
      this.requests.errors += 1;
    }

    this.responseTimes.count += 1;
    this.responseTimes.totalMs += durationMs;
    this.responseTimes.minMs = Math.min(this.responseTimes.minMs, durationMs);
    this.responseTimes.maxMs = Math.max(this.responseTimes.maxMs, durationMs);

    const routeKey = `${method} ${path}`;
    const existing = this.routes.get(routeKey) || {
      count: 0,
      totalMs: 0,
      errors: 0,
    };

    existing.count += 1;
    existing.totalMs += durationMs;
    if (statusCode >= 400) existing.errors += 1;

    this.routes.set(routeKey, existing);

    if (this.routes.size > MAX_ROUTE_SAMPLES) {
      const oldest = this.routes.keys().next().value;
      this.routes.delete(oldest);
    }
  }

  getSnapshot() {
    const memory = process.memoryUsage();
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000);

    const topRoutes = [...this.routes.entries()]
      .map(([route, stats]) => ({
        route,
        count: stats.count,
        avgMs: Number((stats.totalMs / stats.count).toFixed(2)),
        errors: stats.errors,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      uptime: {
        seconds: uptimeSeconds,
        startedAt: new Date(this.startedAt).toISOString(),
      },
      requests: {
        ...this.requests,
      },
      responseTime: {
        count: this.responseTimes.count,
        avgMs:
          this.responseTimes.count === 0
            ? 0
            : Number(
                (
                  this.responseTimes.totalMs / this.responseTimes.count
                ).toFixed(2)
              ),
        minMs:
          this.responseTimes.minMs === Infinity ? 0 : this.responseTimes.minMs,
        maxMs: this.responseTimes.maxMs,
      },
      memory: {
        rssMb: Number((memory.rss / 1024 / 1024).toFixed(2)),
        heapUsedMb: Number((memory.heapUsed / 1024 / 1024).toFixed(2)),
        heapTotalMb: Number((memory.heapTotal / 1024 / 1024).toFixed(2)),
        externalMb: Number((memory.external / 1024 / 1024).toFixed(2)),
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        env: process.env.NODE_ENV || "development",
      },
      topRoutes,
    };
  }

  reset() {
    this.requests = { total: 0, byMethod: {}, byStatus: {}, errors: 0 };
    this.responseTimes = {
      count: 0,
      totalMs: 0,
      minMs: Infinity,
      maxMs: 0,
    };
    this.routes.clear();
  }
}

export default new MetricsStore();
