import AuditLog from "../models/AuditLog.js";

class AuditRepository {
  async create(logData) {
    return await AuditLog.create(logData);
  }

  async findByActor(actorId, { page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find({ actor: actorId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("actor", "name email role"),
      AuditLog.countDocuments({ actor: actorId }),
    ]);

    return { logs, total };
  }

  async findAll({ page = 1, limit = 10, action, resource } = {}) {
    const filter = {};

    if (action) filter.action = action;
    if (resource) filter.resource = resource;

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("actor", "name email role"),
      AuditLog.countDocuments(filter),
    ]);

    return { logs, total };
  }
}

export default new AuditRepository();
