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
      summary: "Deep health check",
      description:
        "Mongo, Redis, queue depths, dead-letter stats, and circuit breaker states.",
      security: [],
      responses: {
        200: jsonResponse("Service healthy.", "healthResponse"),
        503: { description: "Service unhealthy (MongoDB/Redis down)." },
      },
    },
  },
  "/ready": {
    get: {
      tags: ["Health & Monitoring"],
      summary: "Readiness check",
      description: "Checks MongoDB (+ Redis when configured for this role).",
      security: [],
      responses: {
        200: jsonResponse("Service ready."),
        503: { description: "Not ready." },
      },
    },
  },
  "/live": {
    get: {
      tags: ["Health & Monitoring"],
      summary: "Liveness probe",
      description: "Process is up (no dependency checks).",
      security: [],
      responses: {
        200: jsonResponse("Service alive."),
      },
    },
  },
  "/metrics": {
    get: {
      tags: ["Health & Monitoring"],
      summary: "Performance metrics",
      description:
        "HTTP, queue, DLQ, circuit, lock, and idempotency counters.",
      security: [],
      responses: { 200: jsonResponse("Metrics snapshot.") },
    },
  },
};

export default healthPaths;
