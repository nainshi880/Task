import AuditLog from "../models/AuditLog.js";

class AuditRepository {
  async create(logData, session = null) {
    if (session) {
      const [log] = await AuditLog.create([logData], { session });
      return log;
    }
    return await AuditLog.create(logData);
  }

  async findByResource(resource, resourceId, { page = 1, limit = 20 } = {}) {
    const filter = { resource };
    if (resourceId) filter.resourceId = resourceId;

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

  async findByUserActivity(userId, { page = 1, limit = 20 } = {}) {
    const filter = {
      $or: [{ actor: userId }, { resourceId: userId }],
    };

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
