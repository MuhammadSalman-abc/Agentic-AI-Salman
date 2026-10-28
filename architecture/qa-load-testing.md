# API load, concurrency, and scalability assessment

Recorded: 2026-10-28. Scope: API application testing and project knowledge.
Production behavior, provider limits, and existing user data were not changed.

**Follow-up implementation:** queue/rate protections have now been added; the measurements
and gap list below describe the earlier baseline. See the implementation verification
at the end and the current [API contract](../servers/api/features/planning/API.md).

## Reproduce

```powershell
pnpm --dir servers/api run test:load
pnpm --dir servers/api test
pnpm --dir servers/api run typecheck
```

Set `MONGODB_TEST_URI` in the API environment (preferred); otherwise the existing
`MONGODB_URI` is used for connection credentials/topology. A replica set is required.
The load runner always overrides the database name with `load_<pid>_<timestamp>`,
checks the resolved name before dropping it, and never writes to the URI's database.
Missing connection configuration fails explicitly rather than skipping the load suite.

The runner starts its own Express server on an ephemeral loopback port. It uses the
real routes, validation, service, repository, MongoDB indexes and transactions. The
LLM is an injected deterministic fake with a 150ms delay. There are **zero external
Groq/Gemini requests**. Ordinary API tests do not automatically run the load suite.

Raw measurements: `.repo-cache/planning-load-results.json` (overwritten per run).
The report includes completion status, timestamp, provider call count, checkpoint RSS,
latency percentiles, throughput and HTTP status counts; no secrets or prompts.

## Verified scenarios

Final load suite: **11/11 passed**, including the parent test; ten scenario subtests.
API regression: **52/52 passed**, zero failures or skipped tests. API typecheck and
ESLint on all three affected test files passed.

| Scenario | Observation |
|---|---|
| 20 simultaneous submissions with the same idempotency key | One run, one provider call, one complete saved version |
| 10 edits with the same base version | One HTTP 201 commit; nine HTTP 409 conflicts; no overwritten original |
| Six provider 429 failures | One call per run, terminal `rate_limit_exceeded`, no partial version, no retry storm |
| Provider recovers after 429 | A new run succeeds; failed run is not silently retried |
| Independent project generations at 4, 12, 24 concurrency | All 40 journeys complete and their saved versions can be fetched |
| Mixed reads at 10, 50, 100 concurrency | 400 requests at each level, all HTTP 200; health check passes after each burst |
| Eight distinct keys on the same project/base version | One complete commit; seven terminal `VERSION_CONFLICT` results |

The last scenario deliberately gates provider completion until all submissions have
captured the same base version, making the conflict reproducible. All test runs reach
terminal states, and no fake provider calls remain active at successful completion.

## Measurements from the final run

Environment: Node v22.23.2, one API process and load generator on this computer,
real remote MongoDB replica set, pool size 30, fake LLM. The API regression suite was
also running on the host. Results are observations, not reproducible capacity promises.

| Workload | Concurrency | Operations | Ops/sec | p95 | p99 | RSS checkpoint |
|---|---:|---:|---:|---:|---:|---:|
| Competing edits | 10 | 10 | 23.79 | 418ms | 418ms | 142MiB |
| Full generation journey | 4 | 4 | 3.26 | 1,227ms | 1,227ms | 143MiB |
| Full generation journey | 12 | 12 | 3.71 | 3,232ms | 3,232ms | 149MiB |
| Full generation journey | 24 | 24 | 4.21 | 5,691ms | 5,691ms | 155MiB |
| Mixed HTTP reads | 10 | 400 | 108.40 | 335ms | 401ms | 167MiB |
| Mixed HTTP reads | 50 | 400 | 180.24 | 857ms | 884ms | 182MiB |
| Mixed HTTP reads | 100 | 400 | 138.22 | 983ms | 1,010ms | 222MiB |

Mixed reads rotate between health, project list, project detail and complete version
detail. Each response body is consumed. Generation latency includes submission,
status polling and fetching the saved version; ops/sec there measures complete
journeys, not individual HTTP requests. RSS is process memory at checkpoints, not
peak memory or retained heap. Increased RSS alone does not establish a memory leak.

## Findings requiring implementation before broader deployment

1. **No API rate limiter.** `bootstrap/create-app.ts` currently installs request IDs,
   logging, CORS and JSON limits, but no request-rate middleware. A successful burst
   proves handling under this bounded load, not throttling or abuse protection.
2. **No global generation concurrency cap or bounded admission queue.**
   `features/planning/planning.service.ts` starts accepted runs directly. The measured
   peak was 14 simultaneous fake provider calls; this is observed overlap, not a cap.
   A real Groq quota can still produce 429 even for short requirements.
3. **Different idempotency keys can waste provider calls.** Eight distinct requests
   against one project/base ran eight provider calls although only one could commit.
   Atomic version conflicts protect data, but do not prevent token expenditure.
4. **Multi-instance recovery is unsafe without worker ownership.**
   `resumeQueuedRuns()` calls `markActiveRunsInterrupted()` across active runs without
   a worker lease/heartbeat. Starting another API instance could mark another
   instance's live work interrupted. Do not claim horizontal scalability from this run.
5. **Throughput plateaus as concurrency increases.** Generation journey p95 rose from
   1.23s at four clients to 5.69s at 24; read throughput fell between 50 and 100 clients.
   This suggests saturation/queueing in this environment, but does not isolate MongoDB,
   HTTP, validation or host CPU as the cause. Profiling is needed before tuning.

Recommended implementation order: bounded generation concurrency/queue and per-project
active-run admission; explicit API throttling with retry guidance; then worker leases
and measured multi-instance recovery tests if horizontal scaling is required. Reuse
established libraries when introducing throttling rather than inventing a new algorithm.

## Explicit limits of this evidence

This is a bounded, closed-loop burst stress test, not a sustained soak or a search for
the server's breaking point. No production SLA thresholds were supplied, so the suite
asserts integrity, expected errors, terminal completion and recovery rather than a
made-up latency target. It does not prove real-provider quota capacity, real LLM
generation latency, browser responsiveness, independent-host network behavior, a
maximum supported user count, horizontal speedup or safe autoscaling. A production-like
environment and agreed latency/error budgets are needed for those measurements.

## Follow-up: bounded admission and throttling

Implemented feature-owned FIFO generation scheduling with a default one active job and
20 waiting/reserved admissions. Optional validated environment values configure the cap.
Queue overflow returns 503 before persistence/provider execution; cancellation frees a
waiting slot, failed jobs release capacity, and shutdown drains active work before MongoDB
disconnects. Durable queued records remain recoverable after shutdown.

MongoDB active-run admission reuses the same project/input while work is active, including
different idempotency keys. Different active input is rejected with 409. A partial unique
index closes the concurrent-create race. Run success, failure, cancellation and interrupted
recovery clear the active marker. Previously saved versions remain unchanged.

API throttling uses [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
with separate per-IP general and generation-attempt windows. Defaults are 600 API requests
and ten generation attempts per minute. Health/preflight remain available; 429 includes
retry guidance and a stable request ID. The store is process-local.

The updated isolated load suite passed **11/11**. It deliberately uses a two-worker cap,
30 waiting slots and raised test-only HTTP thresholds so capacity tests measure the
queue rather than repeatedly tripping the HTTP limiter. Across the 24 simultaneous
generation journeys, measured active provider calls never exceeded **two**. Eight
alternate keys for one active requirement produced **one** provider call and one run,
instead of the baseline eight calls. Total fake calls fell from 56 to 49. No live LLM
requests were made. The same 1,200 mixed reads remained successful.

Latency under the deliberately imposed two-worker cap includes queue time: p95 for 24
journeys was about 15.11s in this run. This is the expected throughput/latency tradeoff
for bounded provider pressure, not a production LLM speed measurement.

Separate tests verify FIFO ordering, overflow admission, scheduled-ID deduplication,
failure cleanup, waiting cancellation, shutdown drain and rate-window reset. Database
tests verify atomic active admission and release after cancellation. Horizontal scaling
and real-provider quota behavior remain unverified and are not enabled by this change.

Final API regression: **59/59 passed**, including real replica-set integration tests;
zero skipped tests. API lint and typecheck passed. The load test used no live provider
credentials and all generated database records were confined to its disposable database.
