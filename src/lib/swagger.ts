import swaggerJSDoc from "swagger-jsdoc";
import path from "path";

// Use an absolute, cross-platform glob so swagger-jsdoc can find TS route files
const projectRoot = process.cwd().split(path.sep).join("/");
const apiGlob = `${projectRoot}/src/app/api/**/*.ts`;

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Autoworx API",
      version: "1.0.0",
      description: "Autoworx API documentation for Web & Mobile apps",
    },
    servers: [{ url: process.env.NEXT_PUBLIC_APP_URL }],
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
  },
  apis: [apiGlob, `${projectRoot}/src/app/api/**/*.js`],
});
