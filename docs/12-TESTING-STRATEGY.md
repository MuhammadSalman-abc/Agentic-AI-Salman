# Testing and Evaluation Strategy

| Layer | Focus | Example |
|---|---|---|
| Unit/domain | Pure policies/transitions. | Editing after approval invalidates approval. |
| Schema/contract | Requests, responses, persisted versions. | Invalid source ref rejected. |
| Component | Review/intake UI states and accessibility. | Keyboard review and error state. |
| Integration | Repository/provider/destination boundaries. | Tenant scope, timeout, export idempotency. |
| End-to-end | Critical approved workflow. | Intake → clarify → draft → edit → approve → sandbox export. |
| Model evaluation | Human-labeled representative corpus. | Fidelity, coverage, ambiguity, unsupported claims. |
| Security/abuse | Adversarial and boundary behavior. | Injection, cross-tenant IDs, quota abuse. |
| Performance/recovery | Workload and dependency failures. | Concurrency, 429, restart, restore drill. |

## Model evaluation protocol

1. Permission and sanitize representative requirements; set access/retention.
2. Label expected hierarchy, critical facts, ambiguity questions, and unsupported claims; double-label a subset.
3. Version prompts, schemas, provider/model settings, and dataset separately.
4. Score fidelity, coverage, ambiguity quality, criterion testability, coherence, duplication, and safety.
5. Report dimensions, sample, reviewer agreement, limitations—not one unqualified percentage.
6. Run regression before prompt/model changes; review production sample and distribution shift.

## Critical scenarios

Malicious instructions do not override policy; missing information triggers clarification; malformed output never exports; edits after approval block export; replayed export does not duplicate when idempotency supported; uncertain export is reconciled; cross-workspace access denied; provider outage preserves source/status; invalid citations block review-ready state.

Use synthetic test data by default. Do not copy production prompts/source into fixtures without approval and sanitization. CI uses mocks/contract fixtures, not live provider keys.

The repo declares control-plane and workspace test/lint/typecheck/build tasks. Existing test coverage is not evidence of ARBG quality; ARBG evaluation applies when feature code exists.
