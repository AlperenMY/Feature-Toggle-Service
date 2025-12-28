import client from "prom-client";

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"] as const,
});
register.registerMetric(httpRequestsTotal);

export const featureFetchTotal = new client.Counter({
  name: "feature_fetch_total",
  help: "Feature list requests",
  labelNames: ["tenant", "env"] as const,
});
register.registerMetric(featureFetchTotal);

export const featureMutationTotal = new client.Counter({
  name: "feature_mutation_total",
  help: "Feature mutations (upsert/delete/promote)",
  labelNames: ["tenant", "env", "action"] as const,
});
register.registerMetric(featureMutationTotal);
