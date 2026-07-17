import auditRepository from "../repositories/audit.repository.js";
import PAGINATION from "../constants/pagination.js";
import { parsePagination, formatPaginatedResponse } from "../utils/pagination.js";

class AdminAuditService {
  async listAuditLogs(query = {}) {
    const { page, limit } = parsePagination(query);

    const { logs, total } = await auditRepository.list({
      page,
      limit,
      action: query.action,
      resource: query.resource,
      actorId: query.actorId,
      fromDate: query.from || query.fromDate,
      toDate: query.to || query.toDate,
    });

    return formatPaginatedResponse(logs, page, limit, total);
  }
}

export default new AdminAuditService();
