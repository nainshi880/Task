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

export const miscPaths = {
  "/reviews": {
    post: {
      tags: ["Reviews"],
      summary: "Submit review (customer rates technician)",
      description:
        "Customer gives a star rating and optional written review for a completed booking.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["bookingId", "rating"],
              properties: {
                bookingId: { type: "string" },
                rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
                title: { type: "string", example: "Great service" },
                comment: { type: "string", example: "Technician was on time and professional." },
              },
            },
            examples: {
              default: {
                value: {
                  bookingId: "507f1f77bcf86cd799439014",
                  rating: 5,
                  title: "Great service",
                  comment: "Technician was on time and professional.",
                },
              },
            },
          },
        },
      },
      responses: { 201: jsonResponse("Review submitted.") },
    },
  },
  "/reviews/{technicianId}": {
    get: {
      tags: ["Reviews"],
      summary: "Technician reviews & rating",
      description:
        "Public list of approved reviews for a technician with average rating and star distribution.",
      security: [],
      parameters: [
        { name: "technicianId", in: "path", required: true, schema: { type: "string" } },
        { name: "page", in: "query", schema: { type: "integer" } },
        { name: "limit", in: "query", schema: { type: "integer" } },
        { name: "sortBy", in: "query", schema: { type: "string", enum: ["createdAt", "rating"] } },
        { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
      ],
      responses: { 200: jsonResponse("Technician reviews fetched.") },
    },
  },
  "/reviews/{id}": {
    patch: {
      tags: ["Reviews"],
      summary: "Update review",
      description:
        "Customer updates their own review. Approved reviews return to pending moderation.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                rating: { type: "integer", minimum: 1, maximum: 5 },
                title: { type: "string" },
                comment: { type: "string" },
              },
            },
          },
        },
      },
      responses: { 200: jsonResponse("Review updated.") },
    },
    delete: {
      tags: ["Reviews"],
      summary: "Delete review",
      description: "Customer soft-deletes their own review.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: { 200: jsonResponse("Review deleted.") },
    },
  },
  "/favorites": {
    post: {
      tags: ["Favorites"],
      summary: "Add favorite service",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["serviceCategoryId"],
              properties: {
                serviceCategoryId: { type: "string", example: "507f1f77bcf86cd799439011" },
              },
            },
          },
        },
      },
      responses: { 201: jsonResponse("Favorite added.") },
    },
    get: {
      tags: ["Favorites"],
      summary: "View favorites",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer" } },
        { name: "limit", in: "query", schema: { type: "integer" } },
      ],
      responses: { 200: jsonResponse("Favorites fetched.") },
    },
  },
  "/favorites/{id}": {
    delete: {
      tags: ["Favorites"],
      summary: "Remove favorite",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: { 200: jsonResponse("Favorite removed.") },
    },
  },
  "/payments/create-order": {
    post: {
      tags: ["Payments"],
      summary: "Create Razorpay order",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["bookingId"],
              properties: {
                bookingId: { type: "string" },
                amount: { type: "number", example: 499 },
              },
            },
          },
        },
      },
      responses: { 200: jsonResponse("Order created.") },
    },
  },
  "/settings/public": {
    get: {
      tags: ["Settings"],
      summary: "Public platform settings",
      security: [],
      responses: { 200: jsonResponse("Public settings.") },
    },
  },
  "/settings/terms": {
    get: {
      tags: ["Settings"],
      summary: "Terms of service",
      security: [],
      responses: { 200: jsonResponse("Terms content.") },
    },
  },
  "/batch": {
    post: {
      tags: ["Batch"],
      summary: "Batch API requests",
      description: "Execute up to 10 sub-requests in parallel.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/BatchRequest" },
            examples: { default: examples.batchRequest },
          },
        },
      },
      responses: { 200: jsonResponse("Batch completed.") },
    },
  },
  "/technicians/available": {
    get: {
      tags: ["Admin Technicians"],
      summary: "Available technicians",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "city", in: "query", schema: { type: "string" } },
        { name: "skill", in: "query", schema: { type: "string", example: "Plumbing" } },
        { name: "page", in: "query", schema: { type: "integer" } },
      ],
      responses: { 200: jsonResponse("Technicians listed.") },
    },
  },
};

export default miscPaths;
