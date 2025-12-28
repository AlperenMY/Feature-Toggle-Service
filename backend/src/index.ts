import { buildApp } from "./app";
import { prisma } from "./db";
import { redis } from "./redis";
import { es } from "./elastic";
import { config } from "./config";
import { logger } from "./logger";
import type { Deps } from "./types/deps";

async function main() {
  const deps: Deps = { prisma, redis, es, config, logger };

  const app = buildApp(deps);
  app.listen(config.port, () => {
    logger.info({ port: config.port }, "backend listening");
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
