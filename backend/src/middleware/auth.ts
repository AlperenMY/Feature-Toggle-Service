import type { Request, Response, NextFunction } from "express";
import type { TenantJwtPayload } from "../types/jwt";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { createError } from "../utils/createError";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const hdr = req.headers.authorization;
    let token: string | null = null;

    if (hdr?.startsWith("Bearer ")) {
      token = hdr.slice("Bearer ".length);
    } else if (req.headers.cookie) {
      const tokenCookie = req.headers.cookie
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("token="));
      if (tokenCookie)
        token = decodeURIComponent(tokenCookie.split("=").slice(1).join("="));
    }

    if (!token) return next(createError("unauthorized", 401));

    const payload = jwt.verify(token, config.jwtSecret) as TenantJwtPayload;
    req.tenant = { slug: payload.sub };

    return next();
  } catch (err) {
    if (
      err instanceof jwt.TokenExpiredError ||
      err instanceof jwt.JsonWebTokenError
    ) {
      return next(createError("unauthorized", 401));
    }

    return next(createError("errorOnAuth", 500));
  }
}
