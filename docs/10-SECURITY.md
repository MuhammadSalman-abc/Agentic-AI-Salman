# Security, Privacy, and Abuse Controls

**Status:** Threat/control proposal; not a completed assessment or compliance attestation.

## Assets and trust boundaries

Assets: source requirements/attachments; generated drafts; identity and membership; integration/provider credentials; audit events; prompts/results; destination records; operational metadata. Boundaries: browser/API; user content/policy; API/model provider; API/destination; workspace/workspace; app/telemetry; operator/production.

## Threat model

| Threat | Example | Control direction |
|---|---|---|
| Prompt injection | Source says ignore policy or reveal secrets. | Treat source as data; no unrestricted tools; enforce server policy. |
| Cross-workspace access | Guess another draft ID. | Derive scope from identity grants; scoped repositories; negative tests. |
| Unauthorized export | Client changes approval flag or replays stale approval. | Exact-version server approval and export-time authz check. |
| Provider disclosure | Sensitive text sent unnecessarily. | Minimize, provider/legal review, approved settings, redaction where appropriate. |
| Credential theft | Destination key in logs/database. | Secret manager, least privilege, redaction, rotation/revocation. |
| Malicious file | Parser exploit or oversized archive. | Allowlist, size limits, scanning as appropriate, isolated parser, decompression limits. |
| Cost exhaustion | Repeated jobs or repair loop. | Quotas, rate limits, call/time/token ceilings, circuit breaker. |
| Retrieval leakage | Cross-project example returned. | ACL before search, scoped index, deletion propagation, leakage evaluation. |
| Output injection | Generated markup/link triggers unsafe rendering. | Escape output; allowlist destination fields; no executable generated content. |
| Audit tampering | Privileged actor edits events. | Define append-only policy, access separation, integrity monitoring, retention. |

## Identity and authorization proposal

Select an identity provider first. Candidate permissions: workspace owner/admin, editor, reviewer/approver, viewer, integration manager. Separate integration management from content approval. Enforce workspace/project scope in API service and repository boundaries; client-supplied IDs are not proof of access.

## Data handling

Treat inputs as confidential until classified. Collect only what generation needs. Do not log prompts, attachments, tokens, or full responses by default. Define user deletion, retention by record type, provider retention, backups, legal hold, and derived-index cleanup. GDPR, SOC 2, and residency require jurisdiction-specific review; no compliance claim is made here.

## Model/tool controls

- No arbitrary tools; each adapter has narrow functions and scoped credentials.
- User/retrieved text cannot override system policy or grant permissions.
- Parse structured output, then run domain validation and authorization.
- Any tool action requires server allowlist, validated args, budget, and audit event.
- Escape untrusted output in UI; keep policy separate from source content.
- Record config versions without secrets; full prompt retention needs explicit purpose/approval.

## Launch gates

Threat model; resource-level authorization tests; dependency/secret scans; upload review if applicable; approved provider terms; assigned incident owner; deletion and restore drills; approval invariant tests; telemetry redaction review.
