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

### `POST /api/projects/:projectId/generation-runs`

Requires an `Idempotency-Key` header (1–128 characters). Body:
`{ "requirement": string, "instructions"?: string }`. A repeated key and same payload
returns the existing run; a different payload returns `409 idempotency_conflict`. Success
returns `202` with `{ "run": PlanningRun }`.

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

Generated plans are stored and returned as complete hierarchies. The planner asks for at least
three and no more than ten meaningful Features. API validation rejects planner output above
ten Features. Older saved plans remain readable, and the web UI displays up to ten without
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
