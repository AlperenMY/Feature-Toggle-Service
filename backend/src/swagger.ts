import swaggerUi from "swagger-ui-express";
import type { Express, RequestHandler } from "express";

export function mountSwagger(app: Express) {
  const spec = {
    openapi: "3.0.0",
    info: {
      title: "Toggle Service API",
      version: "1.0.0",
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "token",
          description: "HttpOnly JWT cookie issued by /auth/login",
        },
      },
      schemas: {
        Tenant: {
          type: "object",
          properties: {
            slug: { type: "string" },
            name: { type: "string" },
          },
          required: ["slug", "name"],
        },
        AuthRegisterRequest: {
          type: "object",
          properties: {
            tenant: { type: "string" },
            name: { type: "string" },
            password: { type: "string", minLength: 8 },
          },
          required: ["tenant", "password"],
        },
        AuthRegisterResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean" },
            tenant: { $ref: "#/components/schemas/Tenant" },
          },
          required: ["ok", "tenant"],
        },
        AuthLoginRequest: {
          type: "object",
          properties: {
            tenant: { type: "string" },
            password: { type: "string", minLength: 8 },
          },
          required: ["tenant", "password"],
        },
        AuthLoginResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean" },
            token: { type: "string", description: "Also set as HttpOnly cookie" },
            tenant: { $ref: "#/components/schemas/Tenant" },
          },
          required: ["ok", "token", "tenant"],
        },
        FeatureFlagInput: {
          type: "object",
          properties: {
            tenant: { type: "string" },
            env: { type: "string", enum: ["dev", "staging", "prod"] },
            featureKey: { type: "string" },
            featureName: { type: "string" },
            enabled: { type: "boolean" },
            strategyType: { type: "string", enum: ["boolean", "percentage", "targeting"] },
            strategyConfig: { type: "object" },
          },
          required: ["tenant", "env", "featureKey", "enabled", "strategyType"],
        },
        FeatureItem: {
          type: "object",
          properties: {
            featureKey: { type: "string" },
            featureName: { type: "string" },
            enabled: { type: "boolean" },
            strategyType: { type: "string" },
            strategyConfig: { type: "object" },
            version: { type: "number" },
            updatedAt: { type: "string", format: "date-time" },
            evaluated: { type: "boolean" },
          },
          required: ["featureKey", "enabled", "strategyType", "strategyConfig", "version", "updatedAt"],
        },
        FeatureListResponse: {
          type: "object",
          properties: {
            version: { type: "number" },
            total: { type: "number" },
            items: { type: "array", items: { $ref: "#/components/schemas/FeatureItem" } },
          },
          required: ["version", "total", "items"],
        },
        FeatureMutationResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean" },
            flag: { $ref: "#/components/schemas/FeatureItem" },
          },
          required: ["ok", "flag"],
        },
        FeatureDeleteRequest: {
          type: "object",
          properties: {
            tenant: { type: "string" },
            env: { type: "string", enum: ["dev", "staging", "prod"] },
            featureKey: { type: "string" },
          },
          required: ["tenant", "env", "featureKey"],
        },
        FeatureDeleteResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean" },
            deleted: { type: "boolean" },
          },
          required: ["ok", "deleted"],
        },
        PromoteRequest: {
          type: "object",
          properties: {
            tenant: { type: "string" },
            fromEnv: { type: "string", enum: ["dev", "staging", "prod"] },
            toEnv: { type: "string", enum: ["dev", "staging", "prod"] },
            dryRun: { type: "boolean" },
            conflictPolicy: { type: "string", enum: ["skip", "overwrite", "fail"] },
          },
          required: ["tenant", "fromEnv", "toEnv"],
        },
        PromoteConflict: {
          type: "object",
          properties: {
            featureKey: { type: "string" },
            reason: { type: "string" },
          },
          required: ["featureKey", "reason"],
        },
        PromoteResponse: {
          type: "object",
          properties: {
            promoted: { type: "number" },
            conflicts: { type: "array", items: { $ref: "#/components/schemas/PromoteConflict" } },
            dryRun: { type: "boolean" },
          },
          required: ["promoted", "conflicts", "dryRun"],
        },
        AuditLogItem: {
          type: "object",
          properties: {
            ts: { type: "string" },
            actor: { type: "string" },
            action: { type: "string" },
            tenant: { type: "string" },
            env: { type: "string" },
            featureKey: { type: "string" },
            before: {},
            after: {},
          },
          required: ["ts", "actor", "action", "tenant", "env", "featureKey"],
        },
        AuditLogResponse: {
          type: "object",
          properties: {
            total: { type: "number" },
            items: { type: "array", items: { $ref: "#/components/schemas/AuditLogItem" } },
          },
          required: ["total", "items"],
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
          },
          required: ["error"],
        },
      },
    },
    // Accept either Authorization: Bearer or HttpOnly token cookie
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    paths: {
      "/auth/register": {
        post: {
          summary: "Register",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthRegisterRequest" },
                example: { tenant: "zebra", name: "Zebra", password: "password123" },
              },
            },
          },
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthRegisterResponse" },
                  example: { ok: true, tenant: { slug: "zebra", name: "Zebra" } },
                },
              },
            },
            "400": {
              description: "Invalid body",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "409": {
              description: "Tenant exists",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },
      "/auth/login": {
        post: {
          summary: "Login",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthLoginRequest" },
                example: { tenant: "zebra", password: "password123" },
              },
            },
          },
          responses: {
            "200": {
              description: "OK (sets HttpOnly token cookie)",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthLoginResponse" },
                  example: {
                    ok: true,
                    token: "<jwt>",
                    tenant: { slug: "zebra", name: "Zebra" },
                  },
                },
              },
            },
            "400": {
              description: "Invalid body",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "401": {
              description: "Invalid credentials",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },

      "/features": {
        get: {
          summary: "List features",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/FeatureListResponse" } },
              },
            },
            "401": {
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "403": {
              description: "Forbidden (tenant mismatch)",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
        post: {
          summary: "Upsert feature flag",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FeatureFlagInput" },
                example: {
                  tenant: "zebra",
                  env: "dev",
                  featureKey: "new_dashboard",
                  featureName: "New Dashboard",
                  enabled: true,
                  strategyType: "percentage",
                  strategyConfig: { rolloutPercentage: 30 },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/FeatureMutationResponse" } },
              },
            },
            "400": {
              description: "Validation error",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "401": {
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "403": {
              description: "Forbidden (tenant mismatch)",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "404": {
              description: "Tenant not found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
        delete: {
          summary: "Delete feature flag",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FeatureDeleteRequest" },
                example: { tenant: "zebra", env: "dev", featureKey: "new_dashboard" },
              },
            },
          },
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/FeatureDeleteResponse" } },
              },
            },
            "400": {
              description: "Validation error",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "401": {
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "403": {
              description: "Forbidden (tenant mismatch)",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "404": {
              description: "Not found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },
      "/features/promote": {
        post: {
          summary: "Promote flags env->env",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PromoteRequest" },
                example: {
                  tenant: "zebra",
                  fromEnv: "dev",
                  toEnv: "staging",
                  dryRun: false,
                  conflictPolicy: "overwrite",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/PromoteResponse" } },
              },
            },
            "400": {
              description: "Validation error",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "401": {
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "403": {
              description: "Forbidden (tenant mismatch)",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "409": {
              description: "Conflict (fail policy)",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },

      "/audit-logs": {
        get: {
          summary: "List audit logs (ES)",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/AuditLogResponse" } },
              },
            },
            "401": {
              description: "Unauthorized",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },
    },
  };

  app.use(
    "/docs",
    swaggerUi.serve as unknown as RequestHandler,
    swaggerUi.setup(spec) as unknown as RequestHandler
  );
}
