# Functional Requirements — ARBG

Proposed requirements; verification methods describe intended acceptance evidence, not existing test coverage.

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-01 | User can create/select an authorized project. | Must | Unauthorized project access denied; scope attached to every record. |
| FR-02 | User submits a text requirement and optional context. | Must | Original preserved as a revision; empty/oversized input rejected clearly. |
| FR-03 | System asks clarifying questions before drafting when necessary. | Must | Questions state why and cite source; answers create an immutable new input revision. |
| FR-04 | System drafts backlog hierarchy. | Must | Versioned schema valid; levels may be omitted; no item silently dropped. |
| FR-05 | Generated content carries provenance. | Must | Claims have source refs or explicit assumption/inference labels. |
| FR-06 | Stories contain testable criteria. | Must | Criteria observable, linked to story, unresolved business decisions flagged. |
| FR-07 | Output passes deterministic quality gates. | Must | Schema, parent graph, IDs, references, required fields, and policy validated. |
| FR-08 | Correctable findings may be repaired within budget. | Should | Attempts bounded; failure is actionable; no infinite loop. |
| FR-09 | Reviewer edits/accepts/rejects/requests changes. | Must | Actor, time, version, outcome recorded; rejected output cannot export. |
| FR-10 | Approval binds to one immutable draft version. | Must | Editing creates new version and clears approval; API enforces server-side. |
| FR-11 | Approved version exports to selected destination. | Must at launch | Approval rechecked; export outcome recorded; retry safe or reconciled. |
| FR-12 | Authorized user sees audit timeline. | Must | Tenant-scoped events, no secrets/credentials exposed. |
| FR-13 | Admin manages project conventions. | Later | Versioned and validated; instructions cannot grant tools or override policy. |
| FR-14 | System retrieves prior approved examples. | Later | Opt-in, ACL-filtered, source-linked, deletable, leakage-tested. |
| FR-15 | Admin manages integration credentials. | Must for integration | Secret storage, least privilege, revocation, and rotation supported. |

## Backlog item fields

Candidate fields: `id`, `kind`, `title`, `description`, optional `parentId`, `acceptanceCriteria[]`, `sourceReferences[]`, `assumptions[]`, `openQuestions[]`, `status`, `createdAt`, and `schemaVersion`. Exact wire shape is in [API proposal](../08-API-SPEC.md); persistence rules are in [data model](../07-DATA-MODEL.md).
