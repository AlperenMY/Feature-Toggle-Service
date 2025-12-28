import express from "express";
import cors from "cors";
import helmet from "helmet";
import buildRoutes from "./routes";
import { mountSwagger } from "./swagger";
import { errorHandler } from "./middleware/error";
import { requestLog } from "./middleware/requestLog";
import { rateLimitByTenant } from "./middleware/rateLimit";
import type { Deps } from "./types/deps";
import {
  register as metricsRegistry,
  httpRequestsTotal,
} from "./utils/metrics";

export function buildApp(deps: Deps) {
  const app = express();
  const { config, prisma, redis, es } = deps;

  app.set("trust proxy", true);
  app.use(helmet());
  app.use(
    cors({
      origin: deps.config.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "5mb" }));
  app.use(requestLog);

  // Rate limit (tenant from query/body/header)
  app.use(
    rateLimitByTenant({
      redis: redis,
      burst: config.rateLimitBurst,
      sustainedPerSec: config.rateLimitSustainedPerSec,
      tenantFromReq: (req) =>
        (req.query.tenant as string) ||
        (req.body?.tenant as string) ||
        (req.headers["x-tenant"] as string) ||
        null,
    })
  );

  // Metrics endpoint
  app.get("/metrics", async (req, res) => {
    res.setHeader("Content-Type", metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  });

  // naive request counter (route label is best-effort)
  app.use((req, res, next) => {
    res.on("finish", () => {
      httpRequestsTotal.inc({
        method: req.method,
        route: req.path,
        status: String(res.statusCode),
      });
    });
    next();
  });

  mountSwagger(app);
  app.use("/", buildRoutes(deps));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use(errorHandler);
  return app;
}
