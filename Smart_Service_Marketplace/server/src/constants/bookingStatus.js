const BOOKING_STATUS = {
  PENDING_PAYMENT: "Pending Payment",
  /** @deprecated Prefer PENDING_PAYMENT / CONFIRMED; kept for older records */
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In Progress",
  PAUSED: "Paused",
  /** Technician finished work; waiting for customer confirmation */
  AWAITING_CONFIRMATION: "Awaiting Confirmation",
  COMPLETED: "Completed",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

/** Statuses that can be offered to technicians for first-accept claim */
export const OPEN_FOR_CLAIM_STATUSES = [
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.PENDING, // legacy unpaid-era open jobs
];

export const EDITABLE_BOOKING_STATUSES = [
  BOOKING_STATUS.PENDING_PAYMENT,
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ASSIGNED,
];

export const CANCELLABLE_BOOKING_STATUSES = [
  BOOKING_STATUS.PENDING_PAYMENT,
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ASSIGNED,
];

export const TECHNICIAN_ACTIVE_STATUSES = [
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.PAUSED,
  BOOKING_STATUS.AWAITING_CONFIRMATION,
  BOOKING_STATUS.COMPLETED,
];

export default BOOKING_STATUS;
