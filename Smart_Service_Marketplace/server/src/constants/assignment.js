const ASSIGNMENT_METHOD = {
  AUTO: "Auto",
  MANUAL: "Manual",
  CLAIM: "Claim",
};

export const ASSIGNMENT_PRIORITY_WEIGHTS = {
  CITY: 40,
  SKILL: 30,
  AVAILABILITY: 10,
  WORKLOAD: 15,
  RATING: 5,
};

export const ACTIVE_WORKLOAD_STATUSES = [
  "Assigned",
  "Accepted",
  "In Progress",
  "Paused",
  "Awaiting Confirmation",
];

/** Statuses that block receiving/accepting new marketplace jobs */
export const BLOCKING_ACTIVE_JOB_STATUSES = ACTIVE_WORKLOAD_STATUSES;

export default ASSIGNMENT_METHOD;
