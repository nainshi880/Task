const PROHIBITED_KEY_PATTERN = /^\$|\./;

function sanitizeValue(value) {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === "object") {
    const sanitized = {};

    for (const [key, nested] of Object.entries(value)) {
      if (PROHIBITED_KEY_PATTERN.test(key) || key.includes("$")) {
        continue;
      }

      const safeKey = key.replace(/\$/g, "").replace(/\./g, "_");
      sanitized[safeKey] = sanitizeValue(nested);
    }

    return sanitized;
  }

  return value;
}

/**
 * Express 5 exposes `req.query` (and sometimes `req.params`) as getter-only.
 * Reassigning throws; redefine the property with a sanitized plain object instead.
 */
function replaceRequestProperty(req, key, value) {
  const current = req[key];
  if (!current || typeof current !== "object") return;

  try {
    req[key] = value;
  } catch {
    Object.defineProperty(req, key, {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
}

export default function mongoSanitize(req, _res, next) {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) replaceRequestProperty(req, "query", sanitizeValue(req.query));
  if (req.params) replaceRequestProperty(req, "params", sanitizeValue(req.params));
  next();
}
