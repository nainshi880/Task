import { BOOKING_STATUS } from "./bookingStatus";

export const JOB_TABS = {
  incoming: "incoming",
  upcoming: "upcoming",
  ongoing: "ongoing",
  completed: "completed",
  cancelled: "cancelled",
};

export const JOB_FLOW_STEPS = [
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Accepted" },
  { id: "onTheWay", label: "On The Way" },
  { id: "started", label: "Started" },
  { id: "completed", label: "Completed" },
];

export function getJobFlowStepIndex(status, hasArriving = false) {
  if (
    status === BOOKING_STATUS.COMPLETED ||
    status === BOOKING_STATUS.CLOSED
  ) {
    return 4;
  }
  if (status === BOOKING_STATUS.AWAITING_CONFIRMATION) {
    return 4;
  }
  if (
    status === BOOKING_STATUS.IN_PROGRESS ||
    status === BOOKING_STATUS.PAUSED
  ) {
    return 3;
  }
  if (status === BOOKING_STATUS.ACCEPTED && hasArriving) {
    return 2;
  }
  if (status === BOOKING_STATUS.ACCEPTED) {
    return 1;
  }
  if (
    status === BOOKING_STATUS.ASSIGNED ||
    status === BOOKING_STATUS.CONFIRMED ||
    status === BOOKING_STATUS.PENDING
  ) {
    return 0;
  }
  return -1;
}

export function bucketJobs(jobs = []) {
  const incoming = [];
  const upcoming = [];
  const ongoing = [];
  const completed = [];
  const cancelled = [];

  for (const job of jobs) {
    switch (job.status) {
      case BOOKING_STATUS.PENDING:
      case BOOKING_STATUS.CONFIRMED:
      case BOOKING_STATUS.ASSIGNED:
        incoming.push(job);
        break;
      case BOOKING_STATUS.ACCEPTED:
        upcoming.push(job);
        break;
      case BOOKING_STATUS.IN_PROGRESS:
      case BOOKING_STATUS.PAUSED:
        ongoing.push(job);
        break;
      case BOOKING_STATUS.AWAITING_CONFIRMATION:
      case BOOKING_STATUS.COMPLETED:
      case BOOKING_STATUS.CLOSED:
        completed.push(job);
        break;
      case BOOKING_STATUS.CANCELLED:
        cancelled.push(job);
        break;
      default:
        break;
    }
  }

  return { incoming, upcoming, ongoing, completed, cancelled };
}
