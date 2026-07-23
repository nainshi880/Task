export const BOOKING_STATUS = {
  PENDING_PAYMENT: "Pending Payment",
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In Progress",
  PAUSED: "Paused",
  AWAITING_CONFIRMATION: "Awaiting Confirmation",
  COMPLETED: "Completed",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

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

export const TERMINAL_BOOKING_STATUSES = [
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.CLOSED,
  BOOKING_STATUS.CANCELLED,
];

export const TRACKABLE_BOOKING_STATUSES = [
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.PAUSED,
  BOOKING_STATUS.AWAITING_CONFIRMATION,
];

export const BOOKING_TABS = {
  upcoming: "upcoming",
  completed: "completed",
  cancelled: "cancelled",
};

export function isUpcomingBooking(status) {
  return !TERMINAL_BOOKING_STATUSES.includes(status);
}

export function isCompletedBooking(status) {
  return (
    status === BOOKING_STATUS.COMPLETED || status === BOOKING_STATUS.CLOSED
  );
}

export function isCancelledBooking(status) {
  return status === BOOKING_STATUS.CANCELLED;
}

export function canEditBooking(status) {
  return EDITABLE_BOOKING_STATUSES.includes(status);
}

export function canCancelBooking(status) {
  return CANCELLABLE_BOOKING_STATUSES.includes(status);
}

export function shouldTrackLive(status) {
  return TRACKABLE_BOOKING_STATUSES.includes(status);
}

export function needsPayment(booking) {
  if (!booking) return false;
  return (
    booking.paymentStatus !== "Paid" &&
    (booking.status === BOOKING_STATUS.PENDING_PAYMENT ||
      booking.status === BOOKING_STATUS.PENDING)
  );
}

export function canConfirmCompletion(booking) {
  return (
    booking?.status === BOOKING_STATUS.AWAITING_CONFIRMATION &&
    !booking?.customerConfirmed
  );
}

export function canLeaveReview(booking, existingReview = null) {
  if (!booking) return false;
  if (existingReview) return false;
  if (!booking.technician) return false;
  if (!booking.customerConfirmed) return false;
  return (
    booking.status === BOOKING_STATUS.COMPLETED ||
    booking.status === BOOKING_STATUS.CLOSED
  );
}

export function bucketBookings(bookings = []) {
  const upcoming = [];
  const completed = [];
  const cancelled = [];

  for (const booking of bookings) {
    if (isCancelledBooking(booking.status)) cancelled.push(booking);
    else if (isCompletedBooking(booking.status)) completed.push(booking);
    else upcoming.push(booking);
  }

  return { upcoming, completed, cancelled };
}
