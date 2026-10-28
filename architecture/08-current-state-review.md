# 8. Existing Backend Review and Gaps

**Review basis:** inspection of `servers/api` and the repository control-plane project
inventory on 20 October 2026. Validation evidence and environment limits are recorded below.

## 8.1 Already present in this checkout

| Capability | Evidence |
|---|---|
| Planning API feature | `servers/api/features/planning/` contains routes, controller, service, repository, validation, tests, and `API.md`. |
| Project/run/version operations | Service and routes expose project CRUD, run creation/status/cancel, versions, edits, acceptance, and comparison. |
| LLM provider seam | `servers/api/integrations/llm/provider.ts` adapts Groq and Gemini with timeout and normalized errors. |
| Mongo persistence | `servers/api/integrations/mongodb/planning.models.ts` and `planning.repository.ts` define project, run, version records, indexes, run claims, and transactional writes. |
| Orchestration | `planning.service.ts` makes one complete-plan provider call, then runs deterministic whole-plan validation. |
| Recovery hooks | Server startup calls `resumeQueuedRuns`, which marks active runs interrupted and starts queued runs. |
| API contract tests | `planning.api.test.ts` tests controller contracts and route registration with fakes. |

## 8.2 Observed gaps to close before calling the backend stable

1. **Feature count is bounded for new generation.** The planner targets three to ten Features,
   backend validation rejects generated output above ten, and the UI displays up to ten while
   keeping older saved versions readable.
2. **Live provider smoke tests remain optional and unrun.** Groq/Gemini request contracts,
   response parsing, timeout, rate-limit/auth classification, and malformed JSON have mocked
   tests. Credentials are not required by the ordinary suite.
3. **Mongo repository boundary tests now run against Atlas.** They cover unique indexes,
   concurrent claims and idempotency, atomic commits, concurrent stale edits, cancellation
   racing commit, rollback, and restart recovery (evidence below).
4. **Single-call orchestration and cancellation cases are covered with a fake provider.** Tests
   prove one complete-plan call per run, terminal provider/schema/rate-limit failures, and
   cancellation before or after the call without persisting a version.
5. **Transaction topology is checked at startup.** The MongoDB integration issues `hello` and
   accepts replica-set (`setName`) or sharded (`isdbgrid`) topologies; unsupported configured
   deployments are disconnected and fail startup with a clear error. Atlas returned a writable
   replica-set primary during the validation run.
6. **Progress granularity is coarse.** The public run contract currently reports overall
   attempts, not stage-attempt counts or safe stage findings. Decide whether stage-level
   progress belongs in the public contract; do not expose prompts or raw model output.
7. **Acceptance concurrency and end-to-end workflow still need verification.** Database tests
   prove run idempotency and edit concurrency, but not the complete HTTP-to-provider-to-version
   journey or concurrent acceptance requests.
8. **Technical size policy is not centralized.** Keep request/entity ceilings in one named
  policy and apply them to inbound requests and model responses. The generation feature cap is
  ten, and the UI displays up to ten Features.

## 8.3 Do not rebuild existing components

Keep the current API feature, provider seam, Mongo integration, run/version schemas, and
planning flow where they pass the new architecture contracts. Refactor only when tests expose
a correctness problem or a boundary is unclear. This project is hardening existing backend
work, not a greenfield rewrite.

## 8.4 Validation record — 20 October 2026

- Atlas topology probe: connected to a writable replica-set primary; URI was not printed.
- API suite including orchestration edge cases and isolated Atlas integrations: **38/38
  tests passed**.
- Live database cases: indexes/uniqueness, idempotency and worker-claim races, generation
  commit, stale concurrent edits, cancellation before and during commit, forced transaction
  rollback, and restart recovery.
- The database suite used a newly generated temporary database name and dropped that database
  after completion. It did not operate on the application's configured database name.
- The HTTP end-to-end test used the real Express API, a deterministic fake LLM provider, and
  Atlas. It created a project with empty context, submitted a requirement, waited for generation,
  and retrieved the complete saved version over HTTP. Its temporary database was dropped.
- Fake-provider service tests cover one-call generation, terminal validation/provider/rate-limit
  failures, and cancellation before/after the call; no cancelled or failed scenario saved a plan.
- API TypeScript check, focused ESLint, and `pnpm run check`: passed.
- The live run exposed and fixed Mongoose required-string validation for empty `context` and
  `contextSnapshot`, both of which are allowed to be empty by the API contract.

## 8.5 Review outcome

The backend API-to-database journey, MongoDB transaction/recovery gates, and the core
single-call orchestration/cancellation failure paths passed in this environment. Remaining checks
before calling the whole product stable are the UI's first-five Feature projection and optional
live provider smoke testing with configured credentials.

## 8.6 One-call generation update — 27 October 2026

- New runs now make one complete-plan provider call instead of separate analyst, planner, and
  decomposer calls. Validation and atomic persistence still run after the response.
- Focused generation service tests: **7/7 passed**. API typecheck and targeted ESLint passed.
- Full API suite: **28 passed, 2 MongoDB integration tests failed before exercising the new
  flow** because Atlas SRV DNS lookup timed out (`querySrv ETIMEOUT`). Live Mongo integration
  therefore remains unverified in this run.
