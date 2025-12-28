import type { Request, Response, NextFunction } from "express";
import type Redis from "ioredis";

const LUA_TOKEN_BUCKET = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local burst = tonumber(ARGV[2])
local refill = tonumber(ARGV[3])

local data = redis.call("HMGET", key, "tokens", "ts")
local tokens = tonumber(data[1])
local ts = tonumber(data[2])

if tokens == nil then tokens = burst end
if ts == nil then ts = now end

local delta = math.max(0, now - ts) / 1000.0
local refillTokens = delta * refill
tokens = math.min(burst, tokens + refillTokens)

local allowed = 0
local retry = 0
if tokens >= 1 then
  allowed = 1
  tokens = tokens - 1
else
  allowed = 0
  local missing = 1 - tokens
  retry = math.ceil(missing / refill)
end

redis.call("HMSET", key, "tokens", tokens, "ts", now)
redis.call("EXPIRE", key, 3600)

local remaining = math.floor(tokens)
return {allowed, remaining, retry}
`;

export function rateLimitByTenant(opts: {
  redis: Redis;
  burst: number;
  sustainedPerSec: number;
  tenantFromReq: (req: Request) => string | null;
}) {
  const { redis, burst, sustainedPerSec, tenantFromReq } = opts;

  return async (req: Request, res: Response, next: NextFunction) => {
    const tenant = tenantFromReq(req);
    if (!tenant) return next();

    const key = `rl:${tenant}`;
    const now = Date.now();

    const result = (await redis.eval(
      LUA_TOKEN_BUCKET,
      1,
      key,
      String(now),
      String(burst),
      String(sustainedPerSec)
    )) as unknown as [number, number, number];

    const [allowed, remaining, retryAfter] = result;

    res.setHeader("X-RateLimit-Limit", String(burst));
    res.setHeader("X-RateLimit-Remaining", String(remaining));

    if (allowed === 1) return next();

    res.setHeader("Retry-After", String(retryAfter));
    return res.status(429).json({
      error: "rate_limited",
      message: "Too many requests",
      tenant,
      retryAfterSeconds: retryAfter
    });
  };
}
