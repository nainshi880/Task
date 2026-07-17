const jsonResponse = (description) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ApiResponse" },
    },
  },
});

export const dashboardPaths = {
  "/dashboard/customer": {
    get: {
      tags: ["Dashboard"],
      summary: "Customer dashboard statistics",
      description:
        "Returns total bookings, upcoming services, completed services, and total spending.",
      security: [{ bearerAuth: [] }],
      responses: { 200: jsonResponse("Customer statistics fetched.") },
    },
  },
  "/dashboard/technician": {
    get: {
      tags: ["Dashboard"],
      summary: "Technician dashboard statistics",
      description: "Returns earnings, pending jobs, completed jobs, and rating.",
      security: [{ bearerAuth: [] }],
      responses: { 200: jsonResponse("Technician statistics fetched.") },
    },
  },
  "/dashboard/admin": {
    get: {
      tags: ["Dashboard"],
      summary: "Admin dashboard statistics",
      description:
        "Returns total users, total technicians, revenue, and active bookings.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
        { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
      ],
      responses: { 200: jsonResponse("Admin statistics fetched.") },
    },
  },
};

export default dashboardPaths;
