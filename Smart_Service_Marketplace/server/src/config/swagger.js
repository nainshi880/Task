import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import buildOpenApiDefinition from "../docs/openapi/index.js";

const definition = buildOpenApiDefinition();

const options = {
  definition,
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app) => {
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: "Smart Service Marketplace — API Docs",
      customCss: ".swagger-ui .topbar { display: none }",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
        docExpansion: "list",
        defaultModelsExpandDepth: 2,
        syntaxHighlight: { theme: "monokai" },
      },
    })
  );

  app.get("/api/docs.json", (_req, res) => {
    res.json(swaggerSpec);
  });

  app.get("/api/openapi.json", (_req, res) => {
    res.json(swaggerSpec);
  });
};

export default setupSwagger;
