import { tags, securitySchemes, schemas } from "./components.js";
import authPaths from "./paths/auth.js";
import healthPaths from "./paths/health.js";
import bookingPaths from "./paths/bookings.js";
import adminPaths from "./paths/admin.js";
import miscPaths from "./paths/misc.js";
import dashboardPaths from "./paths/dashboard.js";
import reportsPaths from "./paths/reports.js";

const AUTH_GUIDE = `
## Authentication

### 1. JWT Bearer (recommended for SPAs & mobile)
1. \`POST /auth/login\` or \`POST /auth/register\`
2. Use \`data.token\` (access token) in header: \`Authorization: Bearer <token>\`
3. When access token expires, call \`POST /auth/refresh\`

### 2. Refresh token (httpOnly cookie)
- Login/register sets \`refreshToken\` (httpOnly) and \`csrfToken\` (readable) cookies
- \`POST /auth/refresh\` with cookie auth requires header: \`X-CSRF-Token: <csrfToken cookie value>\`
- Alternatively pass \`refreshToken\` in JSON body (no CSRF needed)

### 3. API key (server-to-server)
- Admin creates key: \`POST /admin/api-keys\`
- Send header: \`X-API-Key: ssm_<key>\`
- Can replace JWT on supported routes

### Roles
| Role | Description |
|------|-------------|
| \`customer\` | Book services, pay, review |
| \`technician\` | Accept jobs, update workflow |
| \`admin\` | Full platform management |

### Rate limits
- Global: 200 req / 15 min
- Login: 20 req / 15 min (skip successful)
- Register: 10 req / hour
`;

export function buildOpenApiDefinition() {
  return {
    openapi: "3.0.3",
    info: {
      title: "Smart Service Marketplace API",
      version: "1.0.0",
      description: `REST API for the Smart Service Marketplace — bookings, payments, reviews, admin panel, and platform settings.

${AUTH_GUIDE}`,
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
      license: {
        name: "Proprietary",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "API v1 (relative to server host)",
      },
      {
        url: "http://localhost:5000/api/v1",
        description: "Local development",
      },
    ],
    tags,
    paths: {
      ...healthPaths,
      ...authPaths,
      ...bookingPaths,
      ...adminPaths,
      ...miscPaths,
      ...dashboardPaths,
      ...reportsPaths,
    },
    components: {
      securitySchemes,
      schemas,
      examples: {
        LoginRequest: {
          value: { email: "jane@example.com", password: "SecurePass1!" },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  };
}

export default buildOpenApiDefinition;
