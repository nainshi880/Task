/**
 * API base URL used by axios / sockets.
 * Warn when the page is HTTPS but the API is still HTTP (Mixed Content).
 */
export function resolveApiBaseUrl() {
  const url = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    url.startsWith("http://")
  ) {
    console.warn(
      "[API] Mixed Content: this page is HTTPS but VITE_API_URL is HTTP.",
      "Serve the client over HTTP for local LAN testing, or put the API behind HTTPS (tunnel / reverse proxy).",
      "Current VITE_API_URL:",
      url
    );
  }

  return url;
}

export function resolveSocketBaseUrl() {
  return (
    resolveApiBaseUrl().replace(/\/api\/v1\/?$/, "") || "http://localhost:5000"
  );
}
