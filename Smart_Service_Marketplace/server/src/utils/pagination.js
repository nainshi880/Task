import PAGINATION from "../constants/pagination.js";

export function parsePagination(query = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (Number.isNaN(page) || page < 1) {
    page = PAGINATION.DEFAULT_PAGE;
  }

  if (Number.isNaN(limit) || limit < PAGINATION.MIN_LIMIT) {
    limit = PAGINATION.DEFAULT_LIMIT;
  }

  if (limit > PAGINATION.MAX_LIMIT) {
    limit = PAGINATION.MAX_LIMIT;
  }

  return { page, limit };
}

export function parseSort(query = {}, allowedSortFields = [], defaultField = "createdAt") {
  const sortBy = allowedSortFields.includes(query.sortBy)
    ? query.sortBy
    : defaultField;
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  return { sortBy, sortOrder };
}

export function formatPaginatedResponse(items, page, limit, total, extra = {}) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    ...extra,
  };
}

export function stableQueryKey(query = {}) {
  const normalized = Object.keys(query)
    .sort()
    .reduce((acc, key) => {
      if (query[key] !== undefined && query[key] !== null && query[key] !== "") {
        acc[key] = query[key];
      }
      return acc;
    }, {});

  return JSON.stringify(normalized);
}

export function shouldLazyLoad(query = {}) {
  return query.lazy === true || query.lazy === "true" || query.enrich === false || query.enrich === "false";
}

export default {
  parsePagination,
  parseSort,
  formatPaginatedResponse,
  stableQueryKey,
  shouldLazyLoad,
};
