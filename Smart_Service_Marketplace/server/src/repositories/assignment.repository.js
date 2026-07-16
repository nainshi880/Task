import AssignmentHistory from "../models/AssignmentHistory.js";

class AssignmentRepository {
  async create(historyData, session = null) {
    if (session) {
      const [history] = await AssignmentHistory.create([historyData], {
        session,
      });
      return history;
    }
    return await AssignmentHistory.create(historyData);
  }

  async findByBooking(bookingId) {
    return await AssignmentHistory.find({ booking: bookingId })
      .sort({ createdAt: -1 })
      .populate("technician", "name email phone city rating skills")
      .populate("assignedBy", "name email role")
      .populate("previousTechnician", "name email phone city");
  }

  async findByTechnician(technicianId, { page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      AssignmentHistory.find({ technician: technicianId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("booking", "serviceCategory serviceName status bookingDate")
        .populate("assignedBy", "name email role"),
      AssignmentHistory.countDocuments({ technician: technicianId }),
    ]);

    return { items, total };
  }

  async findLatestByBooking(bookingId) {
    return await AssignmentHistory.findOne({ booking: bookingId })
      .sort({ createdAt: -1 })
      .populate("technician", "name email phone city rating skills");
  }
}

export default new AssignmentRepository();
