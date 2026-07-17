const jsonResponse = (description) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ApiResponse" },
    },
  },
});

const reportParams = [
  { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
  { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
  {
    name: "format",
    in: "query",
    schema: { type: "string", enum: ["json", "csv"] },
    description: "Use `csv` to download a CSV file.",
  },
];

export const reportsPaths = {
  "/admin/reports/bookings": {
    get: {
      tags: ["Reports"],
      summary: "Booking reports",
      security: [{ bearerAuth: [] }],
      parameters: [
        ...reportParams,
        { name: "status", in: "query", schema: { type: "string" } },
        { name: "category", in: "query", schema: { type: "string" } },
      ],
      responses: { 200: jsonResponse("Booking report data or CSV file.") },
    },
  },
  "/admin/reports/revenue": {
    get: {
      tags: ["Reports"],
      summary: "Revenue reports",
      security: [{ bearerAuth: [] }],
      parameters: reportParams,
      responses: { 200: jsonResponse("Revenue report data or CSV file.") },
    },
  },
  "/admin/reports/payments": {
    get: {
      tags: ["Reports"],
      summary: "Payment reports",
      security: [{ bearerAuth: [] }],
      parameters: reportParams,
      responses: { 200: jsonResponse("Payment report data or CSV file.") },
    },
  },
  "/admin/reports/monthly": {
    get: {
      tags: ["Reports"],
      summary: "Monthly combined reports",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "year", in: "query", schema: { type: "integer" } },
        { name: "months", in: "query", schema: { type: "integer" } },
      ],
      responses: { 200: jsonResponse("Monthly reports.") },
    },
  },
  "/admin/audit-logs": {
    get: {
      tags: ["Audit"],
      summary: "List audit logs",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer" } },
        { name: "limit", in: "query", schema: { type: "integer" } },
        { name: "action", in: "query", schema: { type: "string" } },
        { name: "resource", in: "query", schema: { type: "string" } },
        { name: "actorId", in: "query", schema: { type: "string" } },
        { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
        { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
      ],
      responses: { 200: jsonResponse("Audit logs fetched.") },
    },
  },
};

export default reportsPaths;
