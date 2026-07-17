const HTML_TAG_PATTERN = /<[^>]*>/g;

function stripHtml(value) {
  if (typeof value !== "string") return value;
  return value.replace(HTML_TAG_PATTERN, "").trim();
}

function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === "object") {
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      clean[key] = sanitizeObject(value);
    }
    return clean;
  }

  return stripHtml(obj);
}

export default function xssSanitize(req, _res, next) {
  if (req.body) req.body = sanitizeObject(req.body);
  next();
}
