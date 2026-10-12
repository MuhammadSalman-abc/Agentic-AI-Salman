# API Specification Proposal

**Status:** Design baseline only. No ARBG endpoints exist yet. All `/v1` routes require authentication and workspace-scoped authorization.

## Conventions

- JSON over HTTPS, UTF-8; opaque IDs; UTC ISO-8601 timestamps.
- Long generation returns `202 Accepted` with `runId`; client polls status.
- Mutating side effects accept `Idempotency-Key`.
- Errors: `{ "error": { "code": "...", "message": "...", "requestId": "...", "details": [] } }`; never expose stack, prompt, or secret.
- Cursor pagination; every query is scoped to authorized workspace/project.
- Optimistic concurrency via `If-Match` or `expectedVersion`.

## Resource map

| Method/path | Purpose | Required permission |
|---|---|---|
| `POST /v1/projects` | Create project. | `project:write` |
| `GET /v1/projects` | List accessible projects. | Membership |
| `POST /v1/projects/{projectId}/requirements` | Create requirement/source revision. | `requirement:write` |
| `GET /v1/requirements/{requirementId}` | Read requirement/status. | `requirement:read` |
| `POST /v1/requirements/{requirementId}/clarifications` | Answer and create new source revision. | `requirement:write` |
| `POST /v1/requirements/{requirementId}/generation-runs` | Start bounded generation. | `generation:create`, quota |
| `GET /v1/generation-runs/{runId}` | Read status/questions/findings. | Project read |
| `GET /v1/drafts/{draftId}/versions/{version}` | Read immutable output/provenance. | Draft read |
| `POST /v1/drafts/{draftId}/versions/{version}/review` | Edit/reject/approve/request changes. | Role-specific review permission |
| `POST /v1/drafts/{draftId}/versions/{version}/exports` | Export exact approved version. | `export:create` plus server approval check |
| `GET /v1/exports/{exportId}` | Read outcome/reconciliation. | Export read |
| `GET /v1/projects/{projectId}/audit-events` | Query authorized audit history. | `audit:read` |

## Generation request

```json
{
  "sourceRevisionId": "reqrev_opaque",
  "options": { "hierarchyProfile": "default", "includeTasks": true },
  "clientRequestId": "client-generated-unique-id"
}
```

Response: `202` with `{ "runId": "run_opaque", "status": "queued", "statusUrl": "/v1/generation-runs/run_opaque" }`.

## Review and export contracts

Review body: `{ "decision": "approve", "expectedVersion": 3, "comment": "Reviewed" }`. A version mismatch returns `409 VERSION_CHANGED`. Editing creates a new version and clears approval.

Export body: `{ "destinationId": "dest_opaque", "approvedVersion": 3 }`; require `Idempotency-Key`. Return asynchronous status `queued`, `sending`, `succeeded`, `failed`, or `unknown_needs_reconciliation`. Never trust a client-supplied approval flag.

## Contract work before implementation

Define runtime schemas for error envelope, source refs, backlog items, criteria, clarification, findings, roles/scopes, pagination, quotas, and event delivery if required. Publish versioned OpenAPI from source schemas where practical. Keep schemas feature-local until genuinely shared across workspaces.
