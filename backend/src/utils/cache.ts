import type Redis from "ioredis";

export function cacheKey(tenant: string, env: string) {
  return `features:${tenant}:${env}`;
}

export async function getCached<T>(redis: Redis, key: string): Promise<T | null> {
  const raw = await redis.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setCached(redis: Redis, key: string, value: unknown, ttlSeconds: number) {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function invalidate(redis: Redis, key: string) {
  await redis.del(key);
}
