import { Router } from "express";
import { z } from "zod";
import type { Deps } from "../types/deps";
import { requireAuth } from "../middleware/auth";
import { createError } from "../utils/createError";

const querySchema = z.object({
  tenant: z.string().optional(),
  env: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export default function auditRoutes(deps: Deps) {
  const router = Router();
  const { es } = deps;

  router.get("/audit-logs", requireAuth, async (req, res, next) => {
    const query = querySchema.parse(req.query);
    const authTenant = req.tenant?.slug;

    if (!authTenant) return next(createError("Unauthorized", 401));
    // Tenant-auth model: tenant can only read its own audit logs
    const tenant = authTenant;

    const must: any[] = [];
    must.push({ term: { tenant } });
    if (query.env) must.push({ term: { env: query.env } });

    const from = (query.page - 1) * query.pageSize;

    const resp = await es.search({
      index: "audit-logs",
      from,
      size: query.pageSize,
      sort: [{ ts: "desc" }],
      query: must.length ? { bool: { must } } : { match_all: {} },
      track_total_hits: true,
    });

    const items = resp.hits.hits.map((h) => h._source);
    const totalRaw = resp.hits.total;
    const total =
      typeof totalRaw === "number" ? totalRaw : totalRaw?.value ?? 0;

    res.json({ total, items });
  });

  return router;
}
