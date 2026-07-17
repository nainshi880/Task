import { examples } from "../components.js";

const jsonBody = (schemaRef, exampleRef) => ({
  required: true,
  content: {
    "application/json": {
      schema: { $ref: schemaRef },
      examples: exampleRef ? { default: examples[exampleRef] } : undefined,
    },
  },
});

const jsonResponse = (description, exampleRef) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ApiResponse" },
      examples: exampleRef ? { default: examples[exampleRef] } : undefined,
    },
  },
});

export const bookingPaths = {
  "/bookings": {
    post: {
      tags: ["Bookings"],
      summary: "Create booking",
      description: "Customer creates a service request. Supports multipart issue images.",
      security: [{ bearerAuth: [] }],
      requestBody: jsonBody("#/components/schemas/CreateBookingRequest", "createBookingRequest"),
      responses: { 201: jsonResponse("Booking created.") },
    },
    get: {
      tags: ["Bookings"],
      summary: "List my bookings",
      description: "Supports pagination, filter, search, sort. Use `lazy=true` to skip address enrichment.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", example: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", example: 10 } },
        { name: "status", in: "query", schema: { type: "string", example: "Pending" } },
        { name: "q", in: "query", schema: { type: "string", example: "plumbing" } },
        { name: "sortBy", in: "query", schema: { type: "string", example: "createdAt" } },
        { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
      ],
      responses: { 200: jsonResponse("Bookings fetched.") },
    },
  },
  "/bookings/{bookingId}": {
    get: {
      tags: ["Bookings"],
      summary: "Get booking by ID",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "bookingId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: { 200: jsonResponse("Booking details.") },
    },
    put: {
      tags: ["Bookings"],
      summary: "Update booking (before acceptance)",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "bookingId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: { 200: jsonResponse("Booking updated.") },
    },
  },
  "/bookings/{bookingId}/cancel": {
    patch: {
      tags: ["Bookings"],
      summary: "Cancel booking",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "bookingId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: { 200: jsonResponse("Booking cancelled.") },
    },
  },
  "/bookings/{bookingId}/assign/auto": {
    post: {
      tags: ["Assignment"],
      summary: "Auto-assign technician",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "bookingId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: { 200: jsonResponse("Technician assigned.") },
    },
  },
  "/bookings/{bookingId}/assign": {
    post: {
      tags: ["Assignment"],
      summary: "Manually assign technician",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "bookingId", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["technicianId"],
              properties: { technicianId: { type: "string" } },
            },
            examples: {
              default: {
                value: { technicianId: "507f1f77bcf86cd799439013" },
              },
            },
          },
        },
      },
      responses: { 200: jsonResponse("Technician assigned.") },
    },
  },
  "/bookings/{bookingId}/accept": {
    patch: { tags: ["Workflow"], summary: "Accept job", security: [{ bearerAuth: [] }] },
  },
  "/bookings/{bookingId}/reject": {
    patch: { tags: ["Workflow"], summary: "Reject job", security: [{ bearerAuth: [] }] },
  },
  "/bookings/{bookingId}/start": {
    patch: { tags: ["Workflow"], summary: "Start work", security: [{ bearerAuth: [] }] },
  },
  "/bookings/{bookingId}/complete": {
    patch: { tags: ["Workflow"], summary: "Complete work", security: [{ bearerAuth: [] }] },
  },
  "/bookings/{bookingId}/confirm-completion": {
    patch: { tags: ["Workflow"], summary: "Confirm completion", security: [{ bearerAuth: [] }] },
  },
  "/bookings/{bookingId}/close": {
    patch: { tags: ["Workflow"], summary: "Close booking", security: [{ bearerAuth: [] }] },
  },
  "/bookings/search": {
    get: { tags: ["Bookings"], summary: "Search bookings (admin)", security: [{ bearerAuth: [] }] },
  },
  "/bookings/analytics/dashboard": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Booking dashboard analytics",
      security: [{ bearerAuth: [] }],
    },
  },
  "/bookings/{bookingId}/timeline": {
    get: { tags: ["Bookings"], summary: "Booking timeline", security: [{ bearerAuth: [] }] },
  },
};

export default bookingPaths;
