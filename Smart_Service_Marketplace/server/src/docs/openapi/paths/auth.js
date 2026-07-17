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

const errorResponse = (code, description) => ({
  [code]: {
    description,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ErrorResponse" },
        examples: { default: examples.errorUnauthorized },
      },
    },
  },
});

export const authPaths = {
  "/auth/register": {
    post: {
      tags: ["Authentication"],
      summary: "Register customer",
      security: [],
      requestBody: jsonBody("#/components/schemas/RegisterRequest", "registerRequest"),
      responses: {
        201: jsonResponse("Customer registered.", "loginResponse"),
        409: { description: "Email already exists." },
      },
    },
  },
  "/auth/login": {
    post: {
      tags: ["Authentication"],
      summary: "Login",
      description: `Returns JWT **access token** in JSON. Sets **httpOnly** \`refreshToken\` and \`csrfToken\` cookies.`,
      security: [],
      requestBody: jsonBody("#/components/schemas/LoginRequest", "loginRequest"),
      responses: {
        200: jsonResponse("Login successful.", "loginResponse"),
        401: errorResponse(401, "Invalid credentials")[401],
      },
    },
  },
  "/auth/refresh": {
    post: {
      tags: ["Authentication"],
      summary: "Refresh access token",
      description: `Rotates refresh token. Send \`refreshToken\` cookie **or** body field.

When using cookies, include header \`X-CSRF-Token\` matching the \`csrfToken\` cookie.`,
      security: [],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                refreshToken: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: jsonResponse("Token refreshed.", "loginResponse"),
        401: errorResponse(401, "Invalid refresh token")[401],
      },
    },
  },
  "/auth/logout": {
    post: {
      tags: ["Authentication"],
      summary: "Logout",
      description: "Revokes refresh token and clears auth cookies.",
      security: [],
      responses: { 200: jsonResponse("Logout successful.") },
    },
  },
  "/auth/logout-all": {
    post: {
      tags: ["Authentication"],
      summary: "Logout all devices",
      security: [{ bearerAuth: [] }],
      responses: { 200: jsonResponse("Logged out from all devices.") },
    },
  },
  "/auth/me": {
    get: {
      tags: ["Authentication"],
      summary: "Current user",
      security: [{ bearerAuth: [] }],
      responses: {
        200: jsonResponse("Current user fetched."),
        401: errorResponse(401, "Unauthorized")[401],
      },
    },
  },
  "/auth/forgot-password": {
    post: {
      tags: ["Authentication"],
      summary: "Forgot password",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: { email: { type: "string", format: "email" } },
            },
            examples: {
              default: { summary: "Request reset", value: { email: "jane@example.com" } },
            },
          },
        },
      },
      responses: { 200: jsonResponse("Reset email sent.") },
    },
  },
  "/auth/reset-password/{token}": {
    put: {
      tags: ["Authentication"],
      summary: "Reset password",
      security: [],
      parameters: [
        { name: "token", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["password"],
              properties: {
                password: { type: "string", format: "password", example: "NewSecurePass1!" },
              },
            },
          },
        },
      },
      responses: { 200: jsonResponse("Password reset.", "loginResponse") },
    },
  },
  "/admin/login": {
    post: {
      tags: ["Admin"],
      summary: "Admin login",
      security: [],
      requestBody: jsonBody("#/components/schemas/LoginRequest", "adminLoginRequest"),
      responses: { 200: jsonResponse("Admin login successful.", "loginResponse") },
    },
  },
  "/admin/refresh": {
    post: {
      tags: ["Admin"],
      summary: "Admin refresh token",
      security: [],
      responses: { 200: jsonResponse("Admin token refreshed.", "loginResponse") },
    },
  },
  "/admin/api-keys": {
    get: {
      tags: ["Admin Settings"],
      summary: "List API keys",
      security: [{ bearerAuth: [] }],
      responses: { 200: jsonResponse("API keys fetched.") },
    },
    post: {
      tags: ["Admin Settings"],
      summary: "Create API key",
      description: "Plain key returned once. Use header `X-API-Key` for authentication.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string", example: "Integration server" },
                scopes: { type: "array", items: { type: "string" }, example: ["read"] },
              },
            },
          },
        },
      },
      responses: { 201: jsonResponse("API key created.") },
    },
  },
};

export default authPaths;
