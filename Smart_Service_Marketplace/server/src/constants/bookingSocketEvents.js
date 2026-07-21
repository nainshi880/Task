/** Realtime booking/assignment events (Socket.IO user rooms). */
const BOOKING_SOCKET_EVENTS = {
  ASSIGNED: "booking:assigned",
  UPDATED: "booking:updated",
  /** Open job offered to eligible technicians (no preferred tech). */
  AVAILABLE: "booking:available",
  /** Open job claimed by another technician — remove from offer list. */
  CLAIMED: "booking:claimed",
};

export default BOOKING_SOCKET_EVENTS;
