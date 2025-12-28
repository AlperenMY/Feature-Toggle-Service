import type { Request, Response, NextFunction } from "express";
import pinoHttp from "pino-http";
import { logger } from "../logger";

const httpLogger = pinoHttp({ logger });

export function requestLog(req: Request, res: Response, next: NextFunction) {
  return httpLogger(req, res, next);
}
