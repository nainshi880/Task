/**
 * Shared OpenAPI components — schemas, security schemes, and reusable examples.
 */

export const tags = [
  {
    name: "Authentication",
    description:
      "Register, login, JWT access tokens, refresh-token rotation (httpOnly cookie), CSRF, and logout.",
  },
  { name: "Health & Monitoring", description: "Liveness, readiness, and metrics." },
  { name: "Bookings", description: "Customer booking CRUD and lifecycle." },
  { name: "Assignment", description: "Technician assignment." },
  { name: "Workflow", description: "Technician job workflow actions." },
  { name: "Admin", description: "Admin authentication and profile." },
  { name: "Admin Users", description: "Customer user management." },
  { name: "Admin Technicians", description: "Technician onboarding and management." },
  { name: "Admin Bookings", description: "Booking oversight and reports." },
  { name: "Admin Payments", description: "Transactions, refunds, payouts." },
  { name: "Admin Reviews", description: "Review moderation and analytics." },
  { name: "Admin Analytics", description: "Dashboard metrics and growth charts." },
  { name: "Admin Settings", description: "Platform settings, categories, banners." },
  { name: "Reviews", description: "Customer reviews and ratings." },
  { name: "Favorites", description: "Customer favorite service categories." },
  { name: "Dashboard", description: "Role-based dashboard statistics." },
  { name: "Reports", description: "Admin booking, revenue, and payment reports with CSV export." },
  { name: "Audit", description: "Platform audit logs." },
  { name: "Payments", description: "Razorpay payments and webhooks." },
  { name: "Settings", description: "Public platform settings." },
  { name: "Batch", description: "Combined API requests in one call." },
];

export const securitySchemes = {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: `**Access token** (short-lived JWT).

Obtain via \`POST /auth/login\` or \`POST /auth/register\`.

Send as: \`Authorization: Bearer <accessToken>\`

Payload includes \`id\`, \`role\`, and \`tokenVersion\`. Revoked when password changes or logout-all.`,
  },
  apiKeyAuth: {
    type: "apiKey",
    in: "header",
    name: "X-API-Key",
    description: `**Service API key** (admin-created).

Create via \`POST /admin/api-keys\`. Prefix: \`ssm_\`.

Send as: \`X-API-Key: ssm_<key>\`

Alternative to JWT for server-to-server integrations.`,
  },
};

export const schemas = {
  ApiResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      statusCode: { type: "integer", example: 200 },
      message: { type: "string", example: "Success" },
      data: { type: "object", nullable: true },
    },
  },
  ErrorResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: false },
      statusCode: { type: "integer", example: 400 },
      message: { type: "string", example: "Validation failed." },
      stack: { type: "string", nullable: true },
    },
  },
  RegisterRequest: {
    type: "object",
    required: ["name", "email", "password"],
    properties: {
      name: { type: "string", example: "Jane Customer" },
      email: { type: "string", format: "email", example: "jane@example.com" },
      password: {
        type: "string",
        format: "password",
        example: "SecurePass1!",
        description: "Min 8 chars, upper, lower, number, special character.",
      },
      phone: { type: "string", example: "9876543210" },
    },
  },
  LoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email", example: "jane@example.com" },
      password: { type: "string", format: "password", example: "SecurePass1!" },
    },
  },
  AuthData: {
    type: "object",
    properties: {
      user: { $ref: "#/components/schemas/User" },
      token: { type: "string", description: "JWT access token (alias of accessToken)." },
      accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
    },
  },
  User: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      name: { type: "string", example: "Jane Customer" },
      email: { type: "string", example: "jane@example.com" },
      role: { type: "string", enum: ["customer", "technician", "admin"], example: "customer" },
      isActive: { type: "boolean", example: true },
      isVerified: { type: "boolean", example: false },
    },
  },
  CreateBookingRequest: {
    type: "object",
    required: ["serviceCategory", "serviceName", "address", "bookingDate", "bookingTime", "amount"],
    properties: {
      serviceCategory: { type: "string", example: "Plumbing" },
      serviceName: { type: "string", example: "Pipe leak repair" },
      description: { type: "string", example: "Kitchen sink pipe leaking." },
      address: { type: "string", example: "507f1f77bcf86cd799439012" },
      bookingDate: { type: "string", format: "date", example: "2026-07-20" },
      bookingTime: { type: "string", example: "10:30" },
      amount: { type: "number", example: 499 },
    },
  },
  BatchRequest: {
    type: "object",
    required: ["requests"],
    properties: {
      requests: {
        type: "array",
        maxItems: 10,
        items: {
          type: "object",
          properties: {
            id: { type: "string", example: "1" },
            resource: {
              type: "string",
              enum: ["bookings", "notifications", "payments", "wallet"],
            },
            query: { type: "object", example: { page: 1, limit: 5 } },
          },
        },
      },
    },
  },
};

export const examples = {
  registerRequest: {
    summary: "Register customer",
    value: {
      name: "Jane Customer",
      email: "jane@example.com",
      password: "SecurePass1!",
      phone: "9876543210",
    },
  },
  loginRequest: {
    summary: "Customer login",
    value: { email: "jane@example.com", password: "SecurePass1!" },
  },
  adminLoginRequest: {
    summary: "Admin login",
    value: { email: "admin@example.com", password: "AdminPass1!" },
  },
  loginResponse: {
    summary: "Successful login",
    value: {
      success: true,
      statusCode: 200,
      message: "Login successful.",
      data: {
        user: {
          _id: "507f1f77bcf86cd799439011",
          name: "Jane Customer",
          email: "jane@example.com",
          role: "customer",
        },
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      },
    },
  },
  errorUnauthorized: {
    summary: "Unauthorized",
    value: {
      success: false,
      statusCode: 401,
      message: "Access denied. No token provided.",
    },
  },
  createBookingRequest: {
    summary: "Create plumbing booking",
    value: {
      serviceCategory: "Plumbing",
      serviceName: "Pipe leak repair",
      description: "Kitchen sink pipe leaking.",
      address: "507f1f77bcf86cd799439012",
      bookingDate: "2026-07-20",
      bookingTime: "10:30",
      amount: 499,
    },
  },
  healthResponse: {
    summary: "Healthy",
    value: {
      success: true,
      statusCode: 200,
      message: "Health check completed.",
      data: {
        status: "healthy",
        service: "Smart Service Marketplace API",
        uptimeSeconds: 3600,
        checks: { mongo: { status: "up" } },
      },
    },
  },
  batchRequest: {
    summary: "Batch dashboard load",
    value: {
      requests: [
        { id: "1", resource: "bookings", query: { page: 1, limit: 5 } },
        { id: "2", resource: "notifications", query: { page: 1 } },
        { id: "3", resource: "wallet" },
      ],
    },
  },
};

export default { tags, securitySchemes, schemas, examples };
