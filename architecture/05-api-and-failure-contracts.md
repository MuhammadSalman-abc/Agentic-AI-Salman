# 5. API Contracts and Failure Behavior

The endpoint reference and concrete payload examples live in
[`servers/api/features/planning/API.md`](../servers/api/features/planning/API.md). This
document fixes the boundary behavior required by those contracts.

## 5.1 Endpoint inventory

| Capability | Endpoint |
|---|---|
| Create/list project | `POST /api/projects`, `GET /api/projects` |
| Read/update project | `GET /api/projects/:projectId`, `PATCH /api/projects/:projectId` |
| Start/status/cancel run | `POST /api/projects/:projectId/generation-runs`, `GET /api/generation-runs/:runId`, `POST /api/generation-runs/:runId/cancel` |
| Version history/detail | `GET /api/projects/:projectId/versions`, `GET /api/projects/:projectId/versions/:version` |
| Edit/accept/compare | `POST /api/projects/:projectId/versions`, `POST /api/projects/:projectId/versions/:version/accept`, `GET /api/projects/:projectId/versions/compare?from=&to=` |

All requests/responses use JSON and all endpoints return a stable response envelope. Run
creation returns `202`; it never waits for LLM completion. Validate every request and response
at the HTTP boundary. Reject oversized bodies and unknown/invalid identifiers before database
work.

## 5.2 Stable errors

Error shape:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The generated plan did not pass validation.",
    "requestId": "...",
    "details": [{ "path": ["features"], "code": "too_big", "message": "The technical output safety ceiling was exceeded." }]
  }
}
```

No response contains API keys, raw prompts, raw provider bodies, submitted secrets, stack
traces, or full untrusted model output. Validation detail paths and codes are safe to return;
input values are not. Include `X-Request-Id` for correlation.

Expected status classes: `400` invalid input, `404` missing resource, `409` idempotency or
version conflict/terminal cancellation, `413` request too large, `503` unavailable required
database/provider configuration, and `500` unexpected internal failure. Asynchronous
generation failures are represented on the persisted run returned by
`GET /api/generation-runs/:runId`; run creation itself remains `202`. Error codes and statuses
must be documented and contract-tested.

## 5.3 Failure matrix

| Condition | Required result |
|---|---|
| Invalid project ID/body | 400; no run or version created |
| Missing project/run/version | 404 with stable code |
| Provider not configured | 503 before run creation |
| Provider timeout/network/5xx | fail the run after the single provider call; no version |
| Provider auth/unsupported model | fail after the single provider call; safe operator code |
| Invalid complete-plan JSON/schema | fail after the single provider call; no version |
| Newly generated plan has 3–10 Features | validate and save as a version when all other checks pass |
| Generated plan has fewer than 3 or more than 10 Features | fail validation without saving a version or making another provider call |
| Feature count exceeds technical safety ceiling | validation failure; no successful version |
| Invalid parent/dependency/cycle/coverage | hard validation failure; no saved version |
| Cancellation wins before commit | cancelled run; no version |
| Stale base version | 409/version conflict; no partial write |
| Mongo unavailable before create | 503; no untracked generation |
| Mongo transaction unsupported/fails | commit aborts; failed run or unavailable response with clear reason |
| Process restart | queued runs are picked up; prior active runs become interrupted |
| Same idempotency key, same payload | return existing run |
| Same idempotency key, different payload | 409/idempotency conflict |

## 5.4 Security boundary

The V1 application is single-user and local/demo only. CORS is not authentication. Before
network/public or multi-user exposure, add authentication, authorization, ownership scoping,
rate limits, abuse controls, and data-retention rules. Keep Groq/Gemini keys and MongoDB URI
server-only. Treat requirement text and provider output as hostile data. Render output as text;
never execute generated code or markup.
