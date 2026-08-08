/**
 * Process roles for horizontally scaled deployments.
 *
 * api                 — stateless Express + Socket.IO (enqueue only)
 * payment-worker      — BullMQ payment-retry consumers
 * notification-worker — BullMQ notification / push / email consumers
 * all                 — monolith (local/dev default)
 */
export const PROCESS_ROLE = {
  API: "api",
  PAYMENT_WORKER: "payment-worker",
  NOTIFICATION_WORKER: "notification-worker",
  ALL: "all",
};

export function getProcessRole() {
  const raw = String(process.env.PROCESS_ROLE || PROCESS_ROLE.ALL)
    .trim()
    .toLowerCase();
  const allowed = Object.values(PROCESS_ROLE);
  return allowed.includes(raw) ? raw : PROCESS_ROLE.ALL;
}

export function isApiProcess(role = getProcessRole()) {
  return role === PROCESS_ROLE.API || role === PROCESS_ROLE.ALL;
}

export function isPaymentWorkerProcess(role = getProcessRole()) {
  return (
    role === PROCESS_ROLE.PAYMENT_WORKER || role === PROCESS_ROLE.ALL
  );
}

export function isNotificationWorkerProcess(role = getProcessRole()) {
  return (
    role === PROCESS_ROLE.NOTIFICATION_WORKER || role === PROCESS_ROLE.ALL
  );
}

export function shouldRunCron(role = getProcessRole()) {
  // Only one API/all process should run cron to avoid duplicate schedules.
  if (process.env.CRON_ENABLED === "false") return false;
  return role === PROCESS_ROLE.API || role === PROCESS_ROLE.ALL;
}

export default {
  PROCESS_ROLE,
  getProcessRole,
  isApiProcess,
  isPaymentWorkerProcess,
  isNotificationWorkerProcess,
  shouldRunCron,
};
