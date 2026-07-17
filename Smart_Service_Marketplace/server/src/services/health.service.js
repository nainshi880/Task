import mongoose from "mongoose";
import env from "../config/env.js";
import { getRedisClient, isRedisReady } from "../config/redis.js";
import metricsStore from "../utils/metrics.js";

class HealthService {
  async checkMongo() {
    const state = mongoose.connection.readyState;

    return {
      status: state === 1 ? "up" : "down",
      readyState: state,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
    };
  }

  async checkRedis() {
    const client = getRedisClient();

    if (!env.REDIS_URL) {
      return {
        status: "optional",
        configured: false,
        message: "Redis not configured — using in-memory fallback.",
      };
    }

    if (!client || !isRedisReady()) {
      return {
        status: "degraded",
        configured: true,
        message: "Redis configured but not connected.",
      };
    }

    try {
      const pong = await client.ping();
      return {
        status: pong === "PONG" ? "up" : "degraded",
        configured: true,
        latencyMs: null,
      };
    } catch (error) {
      return {
        status: "down",
        configured: true,
        message: error.message,
      };
    }
  }

  async getHealth() {
    const mongo = await this.checkMongo();

    return {
      status: mongo.status === "up" ? "healthy" : "unhealthy",
      service: "Smart Service Marketplace API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      checks: {
        mongo,
      },
    };
  }

  async getReadiness() {
    const [mongo, redis] = await Promise.all([
      this.checkMongo(),
      this.checkRedis(),
    ]);

    const mongoReady = mongo.status === "up";
    const redisReady =
      redis.status === "up" ||
      redis.status === "optional" ||
      redis.status === "degraded";

    const ready = mongoReady && redisReady;

    return {
      status: ready ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      checks: {
        mongo,
        redis,
      },
    };
  }

  getMetrics() {
    return {
      timestamp: new Date().toISOString(),
      ...metricsStore.getSnapshot(),
    };
  }
}

export default new HealthService();
