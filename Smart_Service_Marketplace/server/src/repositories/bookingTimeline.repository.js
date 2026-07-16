import BookingTimeline from "../models/BookingTimeline.js";

class BookingTimelineRepository {
  async create(eventData, session = null) {
    const options = session ? { session } : {};
    const [event] = await BookingTimeline.create([eventData], options);
    return event;
  }

  async findByBooking(bookingId) {
    return await BookingTimeline.find({ booking: bookingId })
      .sort({ createdAt: 1 })
      .populate("actor", "name email role");
  }

  async findHistoryByBooking(bookingId) {
    return await BookingTimeline.find({ booking: bookingId })
      .sort({ createdAt: -1 })
      .populate("actor", "name email role");
  }
}

export default new BookingTimelineRepository();
