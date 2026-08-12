const EXTRA_CHARGE_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  PAID: "PAID",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
};

/** Customer still needs to decide or pay — blocks job completion. */
export const EXTRA_CHARGE_BLOCKING_STATUSES = [
  EXTRA_CHARGE_STATUS.PENDING,
  EXTRA_CHARGE_STATUS.APPROVED,
];

export default EXTRA_CHARGE_STATUS;
