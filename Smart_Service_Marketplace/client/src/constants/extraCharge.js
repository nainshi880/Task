export const EXTRA_CHARGE_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  PAID: "PAID",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
};

export function isOpenExtraCharge(status) {
  return (
    status === EXTRA_CHARGE_STATUS.PENDING ||
    status === EXTRA_CHARGE_STATUS.APPROVED
  );
}

export function canCustomerRespond(status) {
  return status === EXTRA_CHARGE_STATUS.PENDING;
}

export function canCustomerPay(status) {
  return (
    status === EXTRA_CHARGE_STATUS.PENDING ||
    status === EXTRA_CHARGE_STATUS.APPROVED
  );
}
