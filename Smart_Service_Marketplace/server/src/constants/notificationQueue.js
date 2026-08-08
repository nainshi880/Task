export const NOTIFICATION_QUEUE = {
  NAME: "notifications",
  WORKER_CONCURRENCY: Math.max(
    1,
    Number(process.env.NOTIFICATION_WORKER_CONCURRENCY) || 20
  ),
  /** Soft throughput guard for FCM/email providers */
  QUEUE_MAX_PER_SECOND: Math.max(
    1,
    Number(process.env.NOTIFICATION_QUEUE_MAX_PER_SECOND) || 50
  ),
  JOBS: {
    IN_APP: "in_app",
    PUSH: "push",
    EMAIL: "email",
    SOCKET: "socket_emit",
  },
};

export function buildNotificationJobId(type, key) {
  return `notif_${type}_${key || Date.now()}`;
}

export default {
  NOTIFICATION_QUEUE,
  buildNotificationJobId,
};
