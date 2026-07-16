import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Smart Service Marketplace — Booking API",
      version: "1.0.0",
      description:
        "Booking module APIs including CRUD, assignment, workflow, search, analytics, timeline, and production enhancements.",
    },
    servers: [
      {
        url: "/api/v1",
        description: "API v1",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/bookings": {
        post: {
          tags: ["Bookings"],
          summary: "Create booking",
          description: "Customer creates a service request. Supports multipart issue images.",
        },
        get: {
          tags: ["Bookings"],
          summary: "List my bookings",
        },
      },
      "/bookings/{bookingId}": {
        get: {
          tags: ["Bookings"],
          summary: "Get booking by ID",
        },
        put: {
          tags: ["Bookings"],
          summary: "Update booking (before acceptance)",
        },
      },
      "/bookings/{bookingId}/cancel": {
        patch: {
          tags: ["Bookings"],
          summary: "Cancel booking",
        },
      },
      "/bookings/{bookingId}/assign/auto": {
        post: {
          tags: ["Assignment"],
          summary: "Auto-assign technician",
        },
      },
      "/bookings/{bookingId}/assign": {
        post: {
          tags: ["Assignment"],
          summary: "Manually assign technician",
        },
      },
      "/bookings/{bookingId}/accept": {
        patch: {
          tags: ["Workflow"],
          summary: "Technician accepts job",
        },
      },
      "/bookings/{bookingId}/reject": {
        patch: {
          tags: ["Workflow"],
          summary: "Technician rejects job",
        },
      },
      "/bookings/{bookingId}/start": {
        patch: {
          tags: ["Workflow"],
          summary: "Start work",
        },
      },
      "/bookings/{bookingId}/complete": {
        patch: {
          tags: ["Workflow"],
          summary: "Complete work",
        },
      },
      "/bookings/{bookingId}/confirm-completion": {
        patch: {
          tags: ["Workflow"],
          summary: "Customer confirms completion",
        },
      },
      "/bookings/{bookingId}/close": {
        patch: {
          tags: ["Workflow"],
          summary: "Close booking",
        },
      },
      "/bookings/search": {
        get: {
          tags: ["Search & Analytics"],
          summary: "Search bookings (admin)",
        },
      },
      "/bookings/filter": {
        get: {
          tags: ["Search & Analytics"],
          summary: "Filter bookings (admin)",
        },
      },
      "/bookings/analytics/dashboard": {
        get: {
          tags: ["Search & Analytics"],
          summary: "Booking dashboard analytics (admin)",
        },
      },
      "/bookings/{bookingId}/timeline": {
        get: {
          tags: ["Timeline"],
          summary: "Booking timeline events",
        },
      },
      "/bookings/{bookingId}/history": {
        get: {
          tags: ["Timeline"],
          summary: "Booking history",
        },
      },
      "/bookings/{bookingId}/audit-logs": {
        get: {
          tags: ["Timeline"],
          summary: "Booking audit logs (admin)",
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app) => {
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: "Smart Service Marketplace API Docs",
    })
  );

  app.get("/api/docs.json", (_req, res) => {
    res.json(swaggerSpec);
  });
};

export default setupSwagger;
