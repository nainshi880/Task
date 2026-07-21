import mongoose from "mongoose";
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
    const mongo = await this.checkMongo();
    const ready = mongo.status === "up";

    return {
      status: ready ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      checks: {
        mongo,
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
