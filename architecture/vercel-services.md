# Vercel Services deployment proposal

This configuration is prepared for review; it has not been deployed or pushed.

## Services and request flow

| Service | Source | Public routes | Calls |
|---|---|---|---|
| `web` | `apps/web` | All paths except `/api/*` | Runtime health route calls `api` through `API_SERVICE_URL` |
| `api` | `servers/api` | `/api/*` | MongoDB Atlas and the selected LLM provider |

There are no additional internal-only Vercel services in this proposal. API health itself
has no direct public rewrite: `/health` is a Next.js runtime route which calls the API's
`/health` through its binding. Browser planning requests use same-origin `/api/...`.
The API already owns the `/api` prefix, which Vercel preserves, so it is not added again.

The binding belongs to `web`, names `api`, uses format `url`, and injects
`API_SERVICE_URL`. Do not set this variable manually or prefix it with `NEXT_PUBLIC_`.
It is read only in a route handler, never at build time or in middleware, and never
serialized into browser props. A missing public API URL uses an empty base (same origin),
so neither home nor the planning page requires a deployed URL while prerendering.

Local `pnpm dev` can continue using the API URL from `apps/web/.env.local`.

## Vercel project settings

1. Set the project Root Directory to the **repository root**, not `apps/web`.
2. Remove old dashboard build/install overrides; the root `vercel.json` defines them
   separately for each service. Do not add a top-level build/framework setting.
3. Set `ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel uses the pinned pnpm 11.19.0.
4. Delete `NEXT_PUBLIC_API_BASE_URL` from Vercel if it points to localhost or an old
   separate backend. Leave it unset for this same-domain deployment.
5. Add these server runtime variables in Vercel's environment settings:

```dotenv
NODE_ENV=production
API_HOST=0.0.0.0
API_PORT=4000
WEB_ORIGIN=https://YOUR-PRODUCTION-DOMAIN
LOG_LEVEL=info
MONGODB_URI=<Atlas URI>
LLM_PROVIDER=groq
LLM_MODEL=<your supported model>
GROQ_API_KEY=<your server key>
LLM_TIMEOUT_MS=90000
GENERATION_CONCURRENCY=1
```

`API_HOST` and `API_PORT` satisfy the existing validated runtime contract; the production
Express adapter exports an app and does not open a listening socket. Configure appropriate
MongoDB network access and separate preview/test data if preview deployments are enabled.
Keys and database URLs remain server environment variables, outside version control.

## Runtime behavior and limits

The standalone Node entrypoint and Vercel adapter share `createApiRuntime`. The standalone
server retains its bounded waiting queue and restart recovery. The Vercel adapter connects
to MongoDB lazily per warm instance and does **not** run global restart recovery on cold
starts, since that could interrupt another instance's active run.

Vercel generation promises are registered with `waitUntil`. The function budget is 300s;
the LLM timeout remains validated at no more than 180s. `waitUntil` does not turn work into
a durable queue and does not extend the function beyond its maximum duration.

**Waiting slots are zero on Vercel**, regardless of `GENERATION_MAX_QUEUED`. Requests
without an available local worker receive the existing 503/retry response. This avoids
accepting waiting promises that could outlive the originating function. MongoDB's active
project index still deduplicates identical active input across instances.

The worker cap and IP rate store are per instance, not deployment-wide limits. A forcefully
terminated generation can remain active in MongoDB; cancel it through the existing run
API before starting a new run. Durable timeout recovery and deployment-wide concurrency
require a shared queue/worker leases and are not claimed by this configuration.

## Verification

- `vercel.json` passed Vercel's official JSON schema through AJV.
- API tests: **61/61**, including isolated replica-set persistence and serverless bootstrap.
- Frontend tests: **9/9**, including same-origin prerender and runtime binding health calls.
- API/web typechecks and changed-file lint passed; both production builds passed.
- `vercel dev -L --listen 3100` detected both services. The local CLI smoke test returned
  HTTP 500 (`FUNCTION_INVOCATION_FAILED`) on this Windows machine; end-to-end Vercel
  runtime validation is therefore **not verified**. No live LLM call was made.

For local service testing, stop other Next.js dev processes using the same build directory,
set `ENABLE_EXPERIMENTAL_COREPACK=1`, and run `vercel dev -L` from the repository root.
The API's local service adapter listens on Vercel's assigned `PORT` and loads local dotenv
configuration. It does not run single-worker restart recovery against a shared database.

Before deployment, confirm the two service names, public route table, `web -> api`
binding, and Vercel's zero-waiting-slot behavior with the project owner. A preview
deployment must verify `/`, `/agentic-ai`, `/health`, project CRUD, generation/status,
cancellation, and saved-version reads before production is considered operational.

## References

- [Services](https://vercel.com/docs/services)
- [Routing and original-path behavior](https://vercel.com/docs/services/routing)
- [Runtime-only bindings](https://vercel.com/docs/services/bindings)
- [Service configuration](https://vercel.com/docs/services/config-reference)
- [Express adapter](https://vercel.com/docs/frameworks/backend/express)
- [waitUntil lifetime](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#waituntil)
- [Pinned package managers](https://vercel.com/docs/package-managers)
