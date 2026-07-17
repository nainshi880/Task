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

export default function mongoSanitize(req, _res, next) {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
}
