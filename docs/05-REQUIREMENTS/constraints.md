# Constraints, Assumptions, Dependencies, and Unknowns

## Verified repository constraints

| ID | Constraint | Evidence |
|---|---|---|
| C-01 | pnpm; internal dependencies use `workspace:*`. | Root package/workspace files, `AGENTS.md`. |
| C-02 | Current runtimes are Next.js web and Express API. | Workspace project manifests. |
| C-03 | Shared contracts belong in `packages/types` only for genuine reuse. | Architecture policy. |
| C-04 | Server architecture is feature-first, flat by default. | `AGENTS.md`, `.agent/instructions/architecture.md`. |
| C-05 | MongoDB integration exists but is optional and URI-driven. | API validation and integration source. |

## Assumptions

| ID | Assumption | Validation |
|---|---|---|
| A-01 | Human-reviewed drafts are useful. | Prototype and task observation. |
| A-02 | Text intake can validate MVP value. | Review real input patterns. |
| A-03 | One export destination suffices initially. | Rank user needs. |
| A-04 | Existing app/API can host first version. | Architecture and deployment spike. |
| A-05 | Provenance and uncertainty labels build trust. | Blinded review evaluation. |

## Dependencies and decisions

Identity/workspace model; model provider and data terms; first destination and scopes; legal/privacy review; production hosting; operations/alerting; and labeled evaluation corpus. Open decisions include persistence, async execution, document parsing, RAG, provider, schema, destination, retention, deployment, budget, and measurable targets.
