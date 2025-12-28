import type { PrismaClient } from "@prisma/client";
import type Redis from "ioredis";
import type { Client } from "@elastic/elasticsearch";
import type { config } from "../config";
import type pino from "pino";

export type Config = typeof config;

export type Deps = {
  prisma: PrismaClient;
  redis: Redis;
  es: Client;
  config: Config;
  logger: pino.Logger;
};
