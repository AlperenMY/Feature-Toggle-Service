import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().default(8080),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  ELASTIC_URL: z.string().min(1),

  JWT_SECRET: z.string().min(10).default("change-me"),

  CACHE_TTL_SECONDS: z.coerce.number().int().min(1).default(30),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  RATE_LIMIT_BURST: z.coerce.number().int().min(1).default(30),
  RATE_LIMIT_SUSTAINED_PER_SEC: z.coerce.number().int().min(1).default(5),
});

const parsed = schema.parse(process.env);

export const config = {
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,

  databaseUrl: parsed.DATABASE_URL,
  redisUrl: parsed.REDIS_URL,
  elasticUrl: parsed.ELASTIC_URL,

  jwtSecret: parsed.JWT_SECRET,

  cacheTtlSeconds: parsed.CACHE_TTL_SECONDS,

  corsOrigin: parsed.CORS_ORIGIN,

  rateLimitBurst: parsed.RATE_LIMIT_BURST,
  rateLimitSustainedPerSec: parsed.RATE_LIMIT_SUSTAINED_PER_SEC,
};
