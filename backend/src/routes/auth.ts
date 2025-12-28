import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Deps } from "../types/deps";
import { logAudit } from "../utils/audit";
import { createError } from "../utils/createError";

/**
 * Tenant-auth model:
 * - Each tenant acts as the "user" identity.
 * - Register creates a Tenant with a passwordHash.
 * - Login issues a JWT where `sub = tenantSlug`.
 */

const registerBody = z.object({
  tenant: z.string().min(1),
  name: z.string().min(1).optional(),
  password: z.string().min(8),
});

const loginBody = z.object({
  tenant: z.string().min(1),
  password: z.string().min(8),
});

export default function authRoutes(deps: Deps) {
  const route = Router();
  const { prisma, es } = deps;

  route.post("/register", async (req, res, next) => {
    const body = registerBody.parse(req.body);

    const existing = await prisma.tenant.findUnique({
      where: { slug: body.tenant },
    });
    if (existing) {
      return next(createError("tenant_exists", 409));
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const tenant = await prisma.tenant.create({
      data: {
        slug: body.tenant,
        name: body.name ?? body.tenant,
        passwordHash,
      },
    });

    await logAudit(es, {
      ts: new Date().toISOString(),
      actor: body.tenant,
      action: "REGISTER",
      tenant: body.tenant,
      env: "-",
      featureKey: "-",
      before: undefined,
      after: { id: tenant.id, slug: tenant.slug },
    });

    return res.json({
      ok: true,
      tenant: { slug: tenant.slug, name: tenant.name },
    });
  });

  route.post("/login", async (req, res, next) => {
    const body = loginBody.parse(req.body);
    const { prisma, es, config } = deps;

    const tenant = await prisma.tenant.findUnique({
      where: { slug: body.tenant },
    });
    if (!tenant) return next(createError("invalid_credentials", 401));

    const ok = await bcrypt.compare(body.password, tenant.passwordHash);
    if (!ok) return next(createError("invalid_credentials", 401));

    const token = jwt.sign({ sub: tenant.slug }, config.jwtSecret, {
      expiresIn: "12h",
    });

    // Issue token via HttpOnly cookie for browser clients
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.nodeEnv === "production",
      maxAge: 12 * 60 * 60 * 1000, // 12 hours
    });

    await logAudit(es, {
      ts: new Date().toISOString(),
      actor: tenant.slug,
      action: "LOGIN",
      tenant: tenant.slug,
      env: "-",
      featureKey: "-",
      before: undefined,
      after: { tokenIssued: true },
    });

    return res.json({
      ok: true,
      token,
      tenant: { slug: tenant.slug, name: tenant.name },
    });
  });

  return route;
}
