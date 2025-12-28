# Toggle Service (Dockerized Feature Flag Assignment)

This repository contains a dockerized Feature Toggle Service:

- Backend: Node.js + Express + TypeScript
- DB: PostgreSQL (Prisma)
- Cache: Redis (TTL caching + invalidation on write/delete/promote)
- Rate limiting: Redis token bucket, per tenant
- Logging: Elasticsearch (audit logs + feature logs) + structured server logs
- API docs: Swagger UI
- Monitoring: Prometheus `/metrics` + Grafana

## Architecture notes

This codebase follows a **router-factory** pattern: routes are composed in `src/routes/index.ts`, and each route module is a function that accepts a `deps` object (redis/prisma/es/config/logger). This matches the "pass clients into the route factory" style you showed in `app.js` and `routes/index.js`. 

## Quick start

1. Start everything:
```bash
docker compose up -d --build
```

2. Run DB migrations & seed (inside backend container):
```bash
docker compose exec backend npm run migrate:deploy
docker compose exec backend npm run seed
```

3. Open:
- API: http://localhost:8080
- Swagger UI: http://localhost:8080/docs
- UI: http://localhost:3000
- Kibana: http://localhost:5601
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

## API essentials

All APIs require `Authorization: Bearer <JWT>` or the `token` HttpOnly cookie except `/auth/*`.

### Auth
- `POST /auth/register` `{ tenant, name?, password }` -> `{ ok, tenant }`
- `POST /auth/login` `{ tenant, password }` -> `{ ok, token, tenant }` (also sets HttpOnly cookie `token`)

### Features
- `GET /features?tenant=zebra&env=dev&page=1&pageSize=20`
- `POST /features` upsert
- `DELETE /features` delete
- `POST /features/promote` promote from env to env (supports dryRun + conflictPolicy)

### Audit logs
- `GET /audit-logs?tenant=zebra&env=dev&page=1&pageSize=20` (reads from Elasticsearch)

## Evaluation strategies

Flags support:
- `boolean`: enabled true/false
- `percentage`: deterministic bucket by `userId` (0..99) compared to percentage
- `targeting`: allow/deny lists by `userId`

## Cache strategy

- List endpoint caches *raw flag list* per `(tenant, env)` as `features:{tenant}:{env}` with TTL
- Writes invalidate `DEL` for the affected `(tenant, env)`
- Responses include a weak `ETag` based on version + total + max(updatedAt)

## Rate limiting

Per-tenant Redis token bucket:
- `RATE_LIMIT_BURST` as max tokens
- `RATE_LIMIT_SUSTAINED_PER_SEC` as refill speed

Returns:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `Retry-After` on 429

## Tests

Local (outside Docker):
```bash
cd backend
npm i
npm test
```

(For CI you would provide a Postgres/Redis test service or use testcontainers; for the assignment, these tests are focused and runnable with local dependencies.)

## Production migration strategy (recommended)

- Always prefer **backward-compatible** schema changes.
- Apply migrations via `npm run migrate:deploy`.
- Roll out code with feature flags; remove deprecated columns only after full rollout.
