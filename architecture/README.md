# Agentic AI Architecture Set

**Current revision:** 1.2  
**Status:** Design baseline for backend hardening  
**Product:** Chat-based software requirements-to-plan assistant

This directory is the canonical, split architecture for the next implementation phase. It
supersedes conflicting decisions in the previous consolidated v1.1 document at
[`previous-architecture-v1.1.md`](previous-architecture-v1.1.md). The root `ARCHITECTURE.md`
is only a navigation index; use these documents for new work.

## Reading order

1. [Product scope and behavior](01-product-scope.md)
2. [System and component architecture](02-system-architecture.md)
3. [Generation workflow and state machine](03-generation-workflow.md)
4. [Domain and persistence contracts](04-domain-and-persistence.md)
5. [API contracts and failures](05-api-and-failure-contracts.md)
6. [Validation and testing plan](06-validation-and-testing.md)
7. [Web and health-page boundary](07-web-boundary.md)
8. [Existing backend review and gaps](08-current-state-review.md)
9. [Implementation code map and workspace library reuse](09-implementation-code-map.md)
10. [Frontend/backend request flow and system diagrams](10-frontend-backend-system-flow.md)

The API endpoint details remain maintained in the feature-owned
[`servers/api/features/planning/API.md`](../servers/api/features/planning/API.md). That file
is the implementation-facing API reference and must stay aligned with document 05.

For code-level orientation, see the [implementation code map](09-implementation-code-map.md)
and [frontend/backend system flow](10-frontend-backend-system-flow.md). These explain the
current file tree, package boundaries, HTTP connections, persistence relationships, and
generation sequence.

## Decisions fixed for this revision

- One central orchestrator coordinates bounded, sequential AI stages.
- Instruct the AI to create three to ten Features and reject generated output above ten. The
  UI renders up to ten Features and their Stories/Tasks; older saved versions remain readable.
- The plan is navigated as Feature → Story → Task. Selecting a Feature reveals its Stories;
  selecting a Story reveals its Tasks.
- AI output remains a proposal. A user reviews, edits, accepts, compares, and regenerates;
  the system does not execute Tasks or write application code.
- Existing backend code is reused and hardened. New layers, queues, agents, and packages
  require a concrete need.
- MongoDB is the system of record. Atomic version commits require a replica set or sharded
  MongoDB deployment.
- Groq and Gemini are supported behind a server-only provider boundary. Provider credentials
  never reach the web app.
- V1 remains a single-user local/demo boundary without authentication. It must not be exposed
  as a multi-user service until authentication and authorization are designed.

## Delivery sequence

1. Complete backend gap review and lock API/domain contracts.
2. Add deterministic validation, provider, repository, route, and failure tests.
3. Run local MongoDB replica-set and provider contract checks; document any unavailable live
   credentials or infrastructure instead of calling those checks passed.
4. Harden backend until the acceptance gates in document 06 pass.
5. Only then replace the current web planning UI with the chat experience described in
   document 07. The health page remains a health page with one navigation button.

## Status language

“Implemented” means present in this checkout. “Designed” means specified here but not yet
verified in code. “Gap” means an observed missing or insufficient test/contract. This set is
an architecture and work plan, not evidence that the later verification gates have passed.
