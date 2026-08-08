import { Queue } from "bullmq";
import { getBullMqConnection, isRedisConfigured } from "../config/redis.js";
import metricsStore from "../utils/metrics.js";
import logger from "../utils/logger.js";

export const DLQ_QUEUE_NAME = "dead-letter";

let dlq = null;

export function getDeadLetterQueue() {
  if (!isRedisConfigured()) return null;
  if (dlq) return dlq;

  const connection = getBullMqConnection();
  if (!connection) return null;

  dlq = new Queue(DLQ_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 2000 },
      attempts: 1,
    },
  });

  dlq.on("error", (error) => {
    logger.warn(`DLQ error: ${error.message}`);
  });

  return dlq;
}

export function isFinalAttempt(job) {
  if (!job) return false;
  const maxAttempts = Number(job.opts?.attempts) || 1;
  return Number(job.attemptsMade || 0) >= maxAttempts;
}

/**
 * Move a permanently failed job into the dead-letter queue for inspection/replay.
 */
export async function moveToDeadLetter({
  sourceQueue,
  job,
  error,
  reason = "max_attempts_exceeded",
}) {
  const queue = getDeadLetterQueue();
  if (!queue || !job) {
    return { moved: false, reason: "dlq_unavailable" };
  }

  const payload = {
    sourceQueue,
    originalJobId: job.id,
    originalName: job.name,
    failedReason: error?.message || reason,
    reason,
    data: job.data,
    attemptsMade: job.attemptsMade,
    timestamp: new Date().toISOString(),
  };

  try {
    const dlqJob = await queue.add("dead-letter", payload, {
      jobId: `dlq_${sourceQueue}_${job.id}_${Date.now()}`,
    });

    metricsStore.recordDlq(sourceQueue);
    logger.error("Job moved to dead-letter queue", {
      sourceQueue,
      originalJobId: job.id,
      dlqJobId: dlqJob.id,
      failedReason: payload.failedReason,
    });

    return { moved: true, dlqJobId: dlqJob.id };
  } catch (err) {
    logger.warn(`Failed to enqueue DLQ job: ${err.message}`);
    return { moved: false, reason: err.message };
  }
}

/**
 * On worker `failed` events — only DLQ when retries are exhausted.
 */
export async function moveFailedJobToDeadLetter(sourceQueue, job, error) {
  if (!isFinalAttempt(job)) {
    return { moved: false, reason: "retries_remaining" };
  }
  return moveToDeadLetter({ sourceQueue, job, error });
}

export async function getDeadLetterStats() {
  const queue = getDeadLetterQueue();
  if (!queue) {
    return { available: false, waiting: 0, failed: 0, completed: 0 };
  }

  const [waiting, failed, completed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getFailedCount(),
    queue.getCompletedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    available: true,
    name: DLQ_QUEUE_NAME,
    waiting,
    failed,
    completed,
    delayed,
  };
}

export async function listDeadLetterJobs(limit = 50) {
  const queue = getDeadLetterQueue();
  if (!queue) return [];

  const jobs = await queue.getJobs(["waiting", "completed", "failed"], 0, limit - 1);
  return jobs.map((job) => ({
    id: job.id,
    name: job.name,
    data: job.data,
    timestamp: job.timestamp,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
  }));
}

export async function closeDeadLetterQueue() {
  if (!dlq) return;
  await dlq.close();
  dlq = null;
}

export default {
  DLQ_QUEUE_NAME,
  getDeadLetterQueue,
  isFinalAttempt,
  moveToDeadLetter,
  moveFailedJobToDeadLetter,
  getDeadLetterStats,
  listDeadLetterJobs,
  closeDeadLetterQueue,
};
