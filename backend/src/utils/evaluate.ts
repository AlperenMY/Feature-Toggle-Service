import crypto from "crypto";

export type StrategyType = "boolean" | "percentage" | "targeting";
export type PercentageConfig = { rolloutPercentage: number };
export type TargetingConfig = { allow?: string[]; deny?: string[] };

export function evaluateFlag(args: {
  enabled: boolean;
  strategyType: StrategyType;
  strategyConfig: any;
  userId?: string;
}): boolean {
  const { enabled, strategyType, strategyConfig, userId } = args;

  if (!enabled) return false;

  if (strategyType === "boolean") return true;

  if (strategyType === "percentage") {
    const cfg = strategyConfig as PercentageConfig;
    const pct = clamp(cfg.rolloutPercentage ?? 0, 0, 100);
    if (!userId) return false;
    return stableBucket(userId) < pct;
  }

  if (strategyType === "targeting") {
    const cfg = strategyConfig as TargetingConfig;
    if (!userId) return false;
    if (cfg.deny?.includes(userId)) return false;
    if (cfg.allow?.includes(userId)) return true;
    return false;
  }

  return false;
}

function stableBucket(input: string): number {
  const hash = crypto.createHash("sha256").update(input).digest("hex");
  const n = parseInt(hash.slice(0, 8), 16);
  return n % 100;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
