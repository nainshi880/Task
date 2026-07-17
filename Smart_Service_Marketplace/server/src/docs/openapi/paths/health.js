import { examples } from "../components.js";

const jsonResponse = (description, exampleRef) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ApiResponse" },
      examples: exampleRef ? { default: examples[exampleRef] } : undefined,
    },
  },
});

export const healthPaths = {
  "/health": {
    get: {
      tags: ["Health & Monitoring"],
      summary: "Health check (liveness)",
      security: [],
      responses: {
        200: jsonResponse("Service healthy.", "healthResponse"),
        503: { description: "Service unhealthy (MongoDB down)." },
      },
    },
  },
  "/ready": {
    get: {
      tags: ["Health & Monitoring"],
      summary: "Readiness check",
      description: "Checks MongoDB (required) and Redis (optional/degraded).",
      security: [],
      responses: {
        200: jsonResponse("Service ready."),
        503: { description: "Not ready." },
      },
    },
  },
  "/metrics": {
    get: {
      tags: ["Health & Monitoring"],
      summary: "Performance metrics",
      security: [],
      responses: { 200: jsonResponse("Metrics snapshot.") },
    },
  },
};

export default healthPaths;
