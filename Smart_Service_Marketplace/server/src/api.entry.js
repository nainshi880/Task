/**
 * Stateless API entrypoint (no in-process workers).
 * Enqueues payment-retry + notification jobs to Redis/BullMQ.
 *   npm run start:api
 */
process.env.PROCESS_ROLE = process.env.PROCESS_ROLE || "api";
await import("./server.js");
