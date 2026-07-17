export function publicCacheHeaders(maxAgeSeconds = 120) {
  return (_req, res, next) => {
    res.setHeader("Cache-Control", `public, max-age=${maxAgeSeconds}, stale-while-revalidate=60`);
    next();
  };
}

export default { publicCacheHeaders };
