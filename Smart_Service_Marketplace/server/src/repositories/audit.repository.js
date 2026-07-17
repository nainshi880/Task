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

  async list({
    page = 1,
    limit = 20,
    action,
    resource,
    actorId,
    fromDate,
    toDate,
  } = {}) {
    const filter = {};

    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (actorId) filter.actor = actorId;

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

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
