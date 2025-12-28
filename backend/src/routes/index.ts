import { Router } from "express";
import type { Deps } from "../types/deps";

import authRoutes from "./auth";
import featureRoutes from "./features";
import auditRoutes from "./audit";

import { requireAuth } from "../middleware/auth";

export default function buildRoutes(deps: Deps) {
  const router = Router();

  router.use("/auth", authRoutes(deps));

  router.use(requireAuth);

  router.use("/", featureRoutes(deps));
  router.use("/", auditRoutes(deps));

  return router;
}
