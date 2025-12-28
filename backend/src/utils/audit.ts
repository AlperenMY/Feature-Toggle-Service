import type { Client } from "@elastic/elasticsearch";

export type AuditEvent = {
  ts: string;
  actor: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "PROMOTE" | "LOGIN" | "REGISTER";
  tenant: string;
  env: string; // for promote: "from->to"
  featureKey: string; // "*" for promote
  before?: any;
  after?: any;
};

export async function logAudit(es: Client, event: AuditEvent) {
  await es.index({
    index: "audit-logs",
    document: event,
  });
}
