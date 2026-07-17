const jsonResponse = (description) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ApiResponse" },
    },
  },
});

export const adminPaths = {
  "/admin/users": {
    get: {
      tags: ["Admin Users"],
      summary: "List customers",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer" } },
        { name: "q", in: "query", schema: { type: "string" } },
        { name: "isActive", in: "query", schema: { type: "boolean" } },
      ],
      responses: { 200: jsonResponse("Users fetched.") },
    },
  },
  "/admin/users/{userId}": {
    get: {
      tags: ["Admin Users"],
      summary: "User details",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "userId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: { 200: jsonResponse("User details.") },
    },
  },
  "/admin/technicians": {
    get: {
      tags: ["Admin Technicians"],
      summary: "List technicians",
      security: [{ bearerAuth: [] }],
      responses: { 200: jsonResponse("Technicians fetched.") },
    },
  },
  "/admin/technicians/pending": {
    get: {
      tags: ["Admin Technicians"],
      summary: "Pending applications",
      security: [{ bearerAuth: [] }],
      responses: { 200: jsonResponse("Pending applications.") },
    },
  },
  "/admin/bookings": {
    get: {
      tags: ["Admin Bookings"],
      summary: "List all bookings",
      security: [{ bearerAuth: [] }],
      responses: { 200: jsonResponse("Bookings fetched.") },
    },
  },
  "/admin/bookings/reports": {
    get: {
      tags: ["Admin Bookings"],
      summary: "Booking reports",
      security: [{ bearerAuth: [] }],
      responses: { 200: jsonResponse("Reports fetched.") },
    },
  },
  "/admin/payments/transactions": {
    get: {
      tags: ["Admin Payments"],
      summary: "List transactions",
      security: [{ bearerAuth: [] }],
      responses: { 200: jsonResponse("Transactions fetched.") },
    },
  },
  "/admin/reviews": {
    get: {
      tags: ["Admin Reviews"],
      summary: "List reviews",
      security: [{ bearerAuth: [] }],
      responses: { 200: jsonResponse("Reviews fetched.") },
    },
  },
  "/admin/reviews/reported": {
    get: {
      tags: ["Admin Reviews"],
      summary: "Reported reviews",
      security: [{ bearerAuth: [] }],
      responses: { 200: jsonResponse("Reported reviews.") },
    },
  },
  "/admin/analytics": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Dashboard metrics",
      security: [{ bearerAuth: [] }],
      responses: { 200: jsonResponse("Analytics fetched.") },
    },
  },
  "/admin/analytics/growth": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Growth charts",
      security: [{ bearerAuth: [] }],
      responses: { 200: jsonResponse("Growth data.") },
    },
  },
  "/admin/reports/monthly": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Monthly reports",
      security: [{ bearerAuth: [] }],
      responses: { 200: jsonResponse("Monthly reports.") },
    },
  },
  "/admin/settings": {
    get: {
      tags: ["Admin Settings"],
      summary: "Get platform settings",
      security: [{ bearerAuth: [] }],
      responses: { 200: jsonResponse("Settings fetched.") },
    },
    put: {
      tags: ["Admin Settings"],
      summary: "Update platform settings",
      security: [{ bearerAuth: [] }],
      responses: { 200: jsonResponse("Settings updated.") },
    },
  },
};

export default adminPaths;
