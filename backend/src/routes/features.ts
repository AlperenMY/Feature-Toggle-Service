import { Router } from "express";
import { z } from "zod";
import type { Deps } from "../types/deps";
import { cacheKey, getCached, setCached, invalidate } from "../utils/cache";
import { logAudit } from "../utils/audit";
import { featureFetchTotal, featureMutationTotal } from "../utils/metrics";
import { createError } from "../utils/createError";

const listQuery = z.object({
  tenant: z.string(),
  env: z.enum(["dev", "staging", "prod"]),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const upsertBody = z.object({
  tenant: z.string(),
  env: z.enum(["dev", "staging", "prod"]),
  featureKey: z.string().min(1),
  featureName: z.string().optional(),
  enabled: z.boolean(),
  strategyType: z.enum(["boolean", "percentage", "targeting"]),
  strategyConfig: z.any().optional(),
});

const deleteBody = z.object({
  tenant: z.string(),
  env: z.enum(["dev", "staging", "prod"]),
  featureKey: z.string().min(1),
});

const promoteBody = z.object({
  tenant: z.string(),
  fromEnv: z.enum(["dev", "staging", "prod"]),
  toEnv: z.enum(["dev", "staging", "prod"]),
  dryRun: z.boolean().optional().default(false),
  conflictPolicy: z.enum(["skip", "overwrite", "fail"]).default("fail"),
});

const router = Router();

export default function featureRoutes(deps: Deps) {
  const { prisma, es, redis, config } = deps;

  router.get("/features", async (req, res, next) => {
    const query = listQuery.parse(req.query);
    const authTenant = req.tenant?.slug;

    if (!authTenant || query.tenant !== authTenant)
      return next(createError("forbidden", 403));

    featureFetchTotal.inc({ tenant: query.tenant, env: query.env });

    const key = cacheKey(query.tenant, query.env);
    const cached = await getCached<{ version: number; items: any[] }>(
      redis,
      key
    );

    console.log("CACHE HIT?", cached);

    let version = cached?.version ?? 0;
    let items = cached?.items ?? null;

    if (!items) {
      const tenantRow = await prisma.tenant.findUnique({
        where: { slug: query.tenant },
      });
      if (!tenantRow) return res.json({ version: 0, total: 0, items: [] });

      const flags = await prisma.featureFlag.findMany({
        where: { tenantId: tenantRow.id, env: query.env },
        include: { feature: true },
        orderBy: { updatedAt: "desc" },
      });

      version = flags.reduce((m, f) => Math.max(m, f.version), 0);
      items = flags.map((flag) => ({
        featureKey: flag.feature.key,
        featureName: flag.feature.name,
        enabled: flag.enabled,
        strategyType: flag.strategyType,
        strategyConfig: flag.strategyConfig,
        version: flag.version,
        updatedAt: flag.updatedAt,
      }));

      await setCached(redis, key, { version, items }, config.cacheTtlSeconds);
    }

    const total = items.length;
    const maxUpdatedAt = items.reduce((max, item) => {
      const ts = Date.parse(item.updatedAt);
      return Number.isNaN(ts) ? max : Math.max(max, ts);
    }, 0);
    const etag = `W/"${query.tenant}-${query.env}-v${version}-t${total}-u${maxUpdatedAt}-p${query.page}-s${query.pageSize}"`;
    res.setHeader("ETag", etag);
    if (req.headers["if-none-match"] === etag) return res.status(304).end();

    const start = (query.page - 1) * query.pageSize;
    const pageItems = items.slice(start, start + query.pageSize);

    res.json({ version, total, items: pageItems });
  });

  router.post("/features", async (req, res, next) => {
    const body = upsertBody.parse(req.body);
    const authTenant = req.tenant?.slug;

    if (!authTenant || body.tenant !== authTenant)
      return next(createError("forbidden", 403));

    const tenantRow = await prisma.tenant.findUnique({
      where: { slug: body.tenant },
    });
    if (!tenantRow) return next(createError("tenant_not_found", 404));

    const featureRow = await prisma.feature.findUnique({
      where: { key: body.featureKey },
    });
    if (!featureRow) return next(createError("feature_not_found", 404));

    const existing = await prisma.featureFlag.findUnique({
      where: {
        tenantId_featureId_env: {
          tenantId: tenantRow.id,
          featureId: featureRow.id,
          env: body.env,
        },
      },
    });

    const updated = await prisma.featureFlag.upsert({
      where: {
        tenantId_featureId_env: {
          tenantId: tenantRow.id,
          featureId: featureRow.id,
          env: body.env,
        },
      },
      create: {
        tenantId: tenantRow.id,
        featureId: featureRow.id,
        env: body.env,
        enabled: body.enabled,
        strategyType: body.strategyType,
        strategyConfig: body.strategyConfig ?? {},
        version: 1,
      },
      update: {
        enabled: body.enabled,
        strategyType: body.strategyType,
        strategyConfig: body.strategyConfig ?? {},
        version: { increment: 1 },
      },
    });

    await invalidate(redis, cacheKey(body.tenant, body.env));

    featureMutationTotal.inc({
      tenant: body.tenant,
      env: body.env,
      action: existing ? "update" : "create",
    });

    await logAudit(es, {
      ts: new Date().toISOString(),
      actor: authTenant ?? "unknown",
      action: existing ? "UPDATE" : "CREATE",
      tenant: body.tenant,
      env: body.env,
      featureKey: body.featureKey,
      before: existing ?? undefined,
      after: updated,
    });

    res.json({ ok: true, flag: updated });
  });

  router.delete("/features", async (req, res, next) => {
    const body = deleteBody.parse(req.body);
    const authTenant = req.tenant?.slug;

    if (!authTenant || body.tenant !== authTenant)
      return next(createError("forbidden", 403));

    const tenantRow = await prisma.tenant.findUnique({
      where: { slug: body.tenant },
    });
    const featureRow = await prisma.feature.findUnique({
      where: { key: body.featureKey },
    });
    if (!tenantRow || !featureRow) return next(createError("not_found", 404));

    const existing = await prisma.featureFlag.findUnique({
      where: {
        tenantId_featureId_env: {
          tenantId: tenantRow.id,
          featureId: featureRow.id,
          env: body.env,
        },
      },
    });
    if (!existing) return res.json({ ok: true, deleted: false });

    await prisma.featureFlag.delete({
      where: {
        tenantId_featureId_env: {
          tenantId: tenantRow.id,
          featureId: featureRow.id,
          env: body.env,
        },
      },
    });

    await invalidate(redis, cacheKey(body.tenant, body.env));

    const cached = await getCached<{ version: number; items: any[] }>(
      redis,
      cacheKey(body.tenant, body.env)
    );

    console.log("CACHE HIT?", cached);

    featureMutationTotal.inc({
      tenant: body.tenant,
      env: body.env,
      action: "delete",
    });

    await logAudit(es, {
      ts: new Date().toISOString(),
      actor: authTenant ?? "unknown",
      action: "DELETE",
      tenant: body.tenant,
      env: body.env,
      featureKey: body.featureKey,
      before: existing,
      after: undefined,
    });

    res.json({ ok: true, deleted: true });
  });

  router.post("/features/promote", async (req, res, next) => {
    const body = promoteBody.parse(req.body);
    const actor = req.tenant?.slug ?? "unknown";

    const tenantRow = await prisma.tenant.findUnique({
      where: { slug: body.tenant },
    });
    if (!tenantRow) return next(createError("tenant_not_found", 404));

    const fromFlags = await prisma.featureFlag.findMany({
      where: { tenantId: tenantRow.id, env: body.fromEnv },
      include: { feature: true },
    });

    const conflicts: any[] = [];
    let promoted = 0;

    for (const flag of fromFlags) {
      const existing = await prisma.featureFlag.findUnique({
        where: {
          tenantId_featureId_env: {
            tenantId: tenantRow.id,
            featureId: flag.featureId,
            env: body.toEnv,
          },
        },
      });

      if (existing) {
        conflicts.push({
          featureKey: flag.feature.key,
          reason: "exists_in_target",
        });

        if (body.conflictPolicy === "fail") {
          return res.status(409).json({
            promoted,
            conflicts,
            error: "conflict",
            message: "conflicts in target env",
          });
        }
        if (body.conflictPolicy === "skip") continue;
        // overwrite -> proceed
      }

      if (!body.dryRun) {
        await prisma.featureFlag.upsert({
          where: {
            tenantId_featureId_env: {
              tenantId: tenantRow.id,
              featureId: flag.featureId,
              env: body.toEnv,
            },
          },
          create: {
            tenantId: tenantRow.id,
            featureId: flag.featureId,
            env: body.toEnv,
            enabled: flag.enabled,
            strategyType: flag.strategyType,
            strategyConfig: flag.strategyConfig ?? {},
            version: 1,
          },
          update: {
            enabled: flag.enabled,
            strategyType: flag.strategyType,
            strategyConfig: flag.strategyConfig ?? {},
            version: { increment: 1 },
          },
        });
      }

      promoted++;
    }

    if (!body.dryRun) {
      await invalidate(redis, cacheKey(body.tenant, body.fromEnv));
      await invalidate(redis, cacheKey(body.tenant, body.toEnv));

      featureMutationTotal.inc({
        tenant: body.tenant,
        env: body.toEnv,
        action: "promote",
      });

      await logAudit(es, {
        ts: new Date().toISOString(),
        actor,
        action: "PROMOTE",
        tenant: body.tenant,
        env: `${body.fromEnv}->${body.toEnv}`,
        featureKey: "*",
        before: { fromEnv: body.fromEnv },
        after: {
          toEnv: body.toEnv,
          promoted,
          conflictPolicy: body.conflictPolicy,
        },
      });
    }

    res.json({ promoted, conflicts, dryRun: body.dryRun });
  });

  return router;
}
