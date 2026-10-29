# Planning API

Base path: `/api`. All request and response bodies use JSON. The V1 deployment is a
single-user demo without authentication; project IDs are not authorization credentials.

## Projects

### `POST /api/projects`

Creates a project, or reuses the project with the same normalized name and updates its
context. Body: `{ "name": string, "context"?: string }`. Returns `201` with
`{ "project": PlanningProject }`.

### `GET /api/projects?limit=50`

Lists at most 100 projects, most recently updated first. Returns `200` with
`{ "projects": PlanningProject[] }`.

### `GET /api/projects/:projectId`

Returns `200` with `{ "project": PlanningProject }`, or `404 project_not_found`.

### `PATCH /api/projects/:projectId`

Updates one or both of `name` and `context`; an empty body is invalid. A normalized name
already used by another project returns `409 project_name_conflict`. Success returns
`200` with `{ "project": PlanningProject }`.

## Generation runs

Generated tasks explicitly typed `testing` are locally normalized to the `testing`
layer before the final validation gate. The tested backend/frontend/data/integration
remains described in the task text. This does not add a provider call, change task
content or dependencies, or bypass validation of development layers and references.

Requirement admission uses a local heuristic, without another LLM call. The requirement
must be 1–12,000 characters and describe a software capability. Greetings, unrelated
questions and vague briefs return `400 validation_error` with a `custom` issue at
`["requirement"]` containing the guidance: "Tell me what you’d like to build. Describe
an app, website, or feature, and I’ll turn your requirement into features, user stories,
and tasks." A second paragraph gives the task-manager example. The saved-requirement lookup applies the same
check before database access, allowing the chat to show guidance before creating a
project or generation run. The UI preserves the draft and existing plan and handles
this specific rejection as an assistant message; other API failures remain errors.
This heuristic supports common English/Roman Urdu inputs but is not a semantic guarantee.

### Admission and rate limits

The supported deployment is one API worker process. Defaults, configurable through
the API environment:

| Setting | Default | Meaning |
|---|---:|---|
| `GENERATION_CONCURRENCY` | 1 | Active generation jobs (1–8 allowed) |
| `GENERATION_MAX_QUEUED` | 20 | Additional waiting/reserved jobs (0–100 allowed) |
| `API_RATE_LIMIT_PER_MINUTE` | 600 | `/api/` requests per client IP per minute |
| `GENERATION_RATE_LIMIT_PER_MINUTE` | 10 | Generation POST attempts per client IP per minute |

Waiting runs remain `queued` in MongoDB. A bounded FIFO starts them as capacity becomes
available; a cancelled waiting run is removed without an LLM call. Full admission returns
`503 generation_queue_full` with `Retry-After: 5` before creating another run. This header
is retry guidance, not a promise that capacity will be available in exactly five seconds.

An active run with identical requirement/instructions and unchanged project context is
reused even when submitted with a different idempotency key. Another payload on that
project returns `409 generation_active`. A MongoDB partial unique index permits only
one new active run per project; terminal transitions release the slot atomically.
Idempotency keys on previously created runs retain the existing same-body/conflict rules.
At full queue admission, even a repeated submission may receive 503; it can poll its
known run ID instead. Reused alternate keys do not become permanent aliases.

`express-rate-limit` handles IP throttling with an in-memory store. Limited requests
return `429 api_rate_limit_exceeded`, the standard error envelope/request ID, rate-limit
headers and `Retry-After`. Generation attempts count toward both limits. CORS preflight
and `/health` are excluded. Status polling counts toward the general limit. Do not trust
arbitrary forwarded-IP headers; behind a reverse proxy, review the trusted proxy
configuration before deploying (the default remains Express's untrusted-proxy behavior).

On graceful shutdown HTTP admission stops, active jobs finish, and waiting jobs stay in
MongoDB for restart recovery. Recovery admits queued records within the same cap; a large
recovery backlog may delay HTTP startup while capacity becomes available. Existing
interrupted active runs retain the explicit interrupted-failure behavior.

These are **per-process** queue/rate limits, not a distributed quota service. Do not start
multiple workers against this database: distributed leases, a shared rate store and
cross-worker recovery ownership are not implemented. Groq/Gemini provider quotas are
independent; bounded concurrency cannot guarantee that provider 429 never occurs.

### `POST /api/projects/:projectId/generation-runs`

Requires an `Idempotency-Key` header (1–128 characters). Body:
`{ "requirement": string, "instructions"?: string }`. A repeated key and same payload
returns the existing run; a different payload returns `409 idempotency_conflict`. Success
returns `202` with `{ "run": PlanningRun }`.

Each newly generated run makes one structured provider request for the complete Requirement
Brief, Features, Stories, and Tasks. A provider/schema/plan-validation failure ends the run
without an automatic correction request or saved version. Submitting a new run may make
another provider request. An exact saved-requirement lookup can return a plan without creating
a run or calling the provider. Missing implementation Tasks or mappings are reported as validation failures.
If an implemented criterion lacks a testing Task, the API adds one clearly titled `Suggested test AC...`,
using that exact criterion as its expected result, one criterion mapping, and dependencies on the linked
implementation Tasks. These are test-work suggestions, not executed tests or AI-authored scenarios.
Testing coverage checks both criterion mappings and direct/transitive dependency paths to each
linked development Task. A test without a path to a backend Task does not cover that Task merely
because it maps to the same criterion. This checks declared dependencies, not the actual contents
of an implementation or test suite.
Existing Tasks/mappings remain unchanged; no additional provider request is made. Priority labels are normalized to
`low`, `medium`, `high`, or `critical`; unknown/missing labels default to `medium`. Malformed
`tasks` values are rejected.

The planner keeps unrequested capabilities in assumptions or open questions rather than silently
adding them, writes Story descriptions in user-story format, and asks for actionable tasks that
cover the Story's acceptance criteria without requiring a fixed task count. Each newly generated Task must carry
one-based `acceptanceCriteriaIndexes` into its parent Story. Generation requires every criterion
to link to both implementation and testing work; missing implementation links fail validation without another provider request.
Mappings are preserved as returned and structural coverage does not prove semantic completeness.
New Tasks must declare exactly one `layer`: backend, frontend, data, integration, testing, design,
infrastructure, or documentation. Older saved Tasks without layers/mappings remain readable. Task IDs and dependency IDs are shown
in the plan so links can be inspected. Task types are
`technical_development`, `testing`, `design`, `infrastructure`, and `documentation`; optional
types should only be used when the work is actually needed. This guidance improves the generated
draft but does not replace human review of semantic scope and criterion coverage.
`brief.outOfScope` optionally records deliberate exclusions with reasons; assumptions, open
questions, exclusions, task layers, and measurable completion criteria are displayed in the UI.
Scope notes are always visible below the hierarchy and included when copying a Feature.
The prompt targets 3–5 distinct observable acceptance criteria per Story, asks Tasks to derive
product behavior from those criteria, and specifies development dependency handoffs. This is
generation guidance rather than a numeric rejection rule; arbitrary product values are not
filled in locally to satisfy a criterion count.

### `GET /api/generation-runs/:runId`

Returns `200` with `{ "run": PlanningRun, "plan": ArchitecturePlan | null }`. During
generation, `plan` is null. A completed run includes its immutable saved plan. Unknown IDs
return `404 run_not_found`.

### `POST /api/generation-runs/:runId/cancel`

Atomically changes a queued or active run to `cancelled` and returns `202` with
`{ "run": PlanningRun }`. A missing run returns `404`; a terminal run returns
`409 run_not_cancellable`. An in-flight provider request may finish, but its late response
is discarded and cannot be committed as a version.

## Plan versions

Generated plans are stored and returned as complete hierarchies. The planner asks for three to
ten meaningful Features. API validation rejects output outside that range without another
provider request. Older saved plans remain readable, and the web UI displays up to ten without
truncating the version stored in MongoDB.

### `POST /api/planning/versions/lookup`

Body: `{ "requirement": string, "context"?: string }`. Finds the newest saved version
with the exact trimmed requirement and context. Returns `200` with
`{ "match": { "project": PlanningProject, "version": PlanningVersion } | null }`.
The web client can load a match without creating a run or calling an LLM.

### `GET /api/projects/:projectId/versions`

Returns newest-first version summaries in `{ "versions": PlanningVersionSummary[] }`. Each
summary includes `requirementSummary` so versions can be labeled and searched without opening
each plan.

### `GET /api/projects/:projectId/versions/:version`

Returns `200` with `{ "version": PlanningVersion }`, including the complete plan,
provenance, validation record, and input snapshot. Unknown project/version returns the
corresponding `404` code.

### `GET /api/projects/:projectId/versions/compare?from=1&to=2`

Read-only comparison. Returns `{ "comparison": { "fromVersion", "toVersion", "changes" } }`.
Each of `requirements`, `features`, `stories`, and `tasks` has sorted `added`, `removed`,
and `changed` entity ID lists.

### `POST /api/projects/:projectId/versions`

Creates an immutable user-edited version. Body: `{ "baseVersion": number, "plan": ArchitecturePlan }`.
The same whole-plan validation used for generated plans runs before persistence. `baseVersion`
must still be the project's current version; stale edits return `409 version_conflict`.
Success returns `201` with `{ "version": PlanningVersion }`.

The web editor exposes titles, descriptions, priorities, story acceptance criteria, and
task completion criteria on the latest version. Entity IDs, references, and criterion order
are preserved. Saving uses this endpoint without an LLM call; the previous version remains
unchanged. A conflict retains the browser draft for review.

### Token usage metadata

Run status and version detail responses optionally include `usage` with `inputTokens`,
`outputTokens`, and `totalTokens`. Each count is a non-negative integer or `null` when
unavailable. Counts come directly from provider response metadata; totals may include
reasoning tokens. Missing metadata and older records return `null`, rather than estimated
counts. Generated versions retain the run's usage. Manual edits have no generation usage.
Saved-plan lookup makes no new provider call and preserves the saved usage metadata.

### `POST /api/projects/:projectId/versions/:version/accept`

Sets the project's `acceptedVersion` pointer without changing the plan. Returns `200` with
`{ "project": PlanningProject }`. Missing project/version returns `404`.

### `DELETE /api/projects/:projectId/versions/:version`

Permanently removes the selected version and returns `204`. Surviving versions are renumbered
from 1 in creation order; base-version, current-version, accepted-version, and generation-run
references are updated in the same MongoDB transaction. If the accepted version is removed,
the accepted pointer is cleared. Unknown project/version returns `404`.

## Errors

All failures use `{ "error": { "code": string, "message": string, "requestId"?: string,
"details"?: unknown } }`. Request IDs are also returned in `X-Request-Id`. Validation
details contain field paths and issue codes only; they do not echo submitted values.
Provider credentials, raw model output, prompts, and stack traces are never returned.

Common statuses: `400 validation_error`, `404 project_not_found | run_not_found |
version_not_found | route_not_found`, `409 project_name_conflict | idempotency_conflict |
version_conflict | run_not_cancellable`, `503 persistence_unavailable |
provider_unavailable`, and `500 internal_error`.

MongoDB must run as a replica set or sharded cluster for atomic generation/edit commits.
