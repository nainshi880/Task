const BOOKING_STATUS = {

  PENDING: "Pending",

  ASSIGNED: "Assigned",

  ACCEPTED: "Accepted",

  IN_PROGRESS: "In Progress",

  COMPLETED: "Completed",

  CLOSED: "Closed",

  CANCELLED: "Cancelled",

  status: {
    type: String,
    enum: Object.values(BOOKING_STATUS),
    default: BOOKING_STATUS.PENDING,
}

};



export default BOOKING_STATUS;