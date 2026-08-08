import mongoose from "mongoose";
import metricsStore from "../utils/metrics.js";
import { isRedisConfigured, getRedisConnection } from "../config/redis.js";
import { getAllCircuitSnapshots } from "../utils/circuitBreaker.js";
import { getDeadLetterStats } from "../queues/deadLetter.queue.js";
import { getPaymentRetryQueue } from "../queues/paymentRetry.queue.js";
import { getNotificationQueue } from "../queues/notification.queue.js";
import { getProcessRole } from "../constants/processRole.js";
import { isFirebaseReady } from "../config/firebase.js";

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
    if (!isRedisConfigured()) {
      return { status: "disabled", configured: false };
    }

    const redis = getRedisConnection();
    if (!redis) {
      return { status: "down", configured: true };
    }

    try {
      const pong = await redis.ping();
      return {
        status: pong === "PONG" ? "up" : "degraded",
        configured: true,
      };
    } catch (error) {
      return {
        status: "down",
        configured: true,
        error: error.message,
      };
    }
  }

  async checkQueues() {
    const payment = getPaymentRetryQueue();
    const notifications = getNotificationQueue();

    const snapshot = async (queue, name) => {
      if (!queue) {
        return { name, available: false };
      }
      const [waiting, active, delayed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getDelayedCount(),
        queue.getFailedCount(),
      ]);
      return {
        name,
        available: true,
        waiting,
        active,
        delayed,
        failed,
      };
    };

    const [paymentStats, notificationStats, dlq] = await Promise.all([
      snapshot(payment, "payment-retry"),
      snapshot(notifications, "notifications"),
      getDeadLetterStats(),
    ]);

    return {
      paymentRetry: paymentStats,
      notifications: notificationStats,
      deadLetter: dlq,
    };
  }

  async getHealth() {
    const [mongo, redis, queues] = await Promise.all([
      this.checkMongo(),
      this.checkRedis(),
      this.checkQueues(),
    ]);

    const circuits = getAllCircuitSnapshots();
    const openCircuits = circuits.filter((c) => c.state === "open");

    const criticalDown =
      mongo.status !== "up" ||
      (redis.configured && redis.status === "down");

    return {
      status: criticalDown ? "unhealthy" : "healthy",
      service: "Smart Service Marketplace API",
      version: "1.0.0",
      role: getProcessRole(),
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      checks: {
        mongo,
        redis,
        firebase: {
          status: isFirebaseReady() ? "up" : "disabled",
        },
        queues,
        circuits: {
          openCount: openCircuits.length,
          items: circuits,
        },
      },
    };
  }

  async getReadiness() {
    const [mongo, redis] = await Promise.all([
      this.checkMongo(),
      this.checkRedis(),
    ]);

    const role = getProcessRole();
    const needsRedis =
      role === "payment-worker" ||
      role === "notification-worker" ||
      role === "api";

    const ready =
      mongo.status === "up" &&
      (!needsRedis || !redis.configured || redis.status === "up");

    return {
      status: ready ? "ready" : "not_ready",
      role,
      timestamp: new Date().toISOString(),
      checks: {
        mongo,
        redis,
      },
    };
  }

  async getLiveness() {
    return {
      status: "alive",
      role: getProcessRole(),
      pid: process.pid,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  getMetrics() {
    return {
      timestamp: new Date().toISOString(),
      role: getProcessRole(),
      circuits: getAllCircuitSnapshots(),
      ...metricsStore.getSnapshot(),
    };
  }
}

export default new HealthService();
