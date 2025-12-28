import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = Number(err?.statusCode || 500);
  const message = err?.message || "internal_error";

  res.status(status).json({
    error: status >= 500 ? "internal_error" : "bad_request",
    message,
  });
}
