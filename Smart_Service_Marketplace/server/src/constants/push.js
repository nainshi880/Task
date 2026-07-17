const PUSH_EVENT = {
  BOOKING_ACCEPTED: "booking_accepted",
  BOOKING_ASSIGNED: "booking_assigned",
  TECHNICIAN_ARRIVING: "technician_arriving",
  WORK_STARTED: "work_started",
  WORK_COMPLETED: "work_completed",
  PAYMENT_SUCCESS: "payment_success",
  PAYMENT_FAILED: "payment_failed",
  REVIEW_REMINDER: "review_reminder",
  CHAT_MESSAGE: "chat_message",
};

const PUSH_PROVIDER = {
  FCM: "fcm",
  ONESIGNAL: "onesignal",
};

const DEVICE_PLATFORM = {
  ANDROID: "android",
  IOS: "ios",
  WEB: "web",
};

export { PUSH_EVENT, PUSH_PROVIDER, DEVICE_PLATFORM };
